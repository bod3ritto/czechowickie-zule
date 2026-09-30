import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// admin-action imports server-only modules; stub them for the node test env.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({ getAdmin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSessionClient: vi.fn() }));

const { adminAction, adminOnlyAction } = await import("@/lib/actions/admin-action");
const { ok } = await import("@/lib/actions/result");
const { decideAdminAccess, safeRedirectPath } = await import("@/lib/auth/policy");
const { friendlyDbError } = await import("@/lib/actions/result");

type Deps = Parameters<typeof adminAction>[2] & object;

function deps(admin: { userId: string; email: string; role?: "admin" | "moderator" } | null): Deps {
  return {
    getAdmin: async () => (admin ? { role: "admin" as const, ...admin } : null),
    createDb: vi.fn(async () => ({}) as never),
  };
}

const schema = z.object({ firstName: z.string().min(1, "Imię jest wymagane.") });

describe("admin authorization policy", () => {
  it("requires a session and the admin role", () => {
    expect(decideAdminAccess(null, false)).toBe("unauthenticated");
    expect(decideAdminAccess({ id: "u1" }, false)).toBe("forbidden");
    expect(decideAdminAccess({ id: "u1" }, true)).toBe("ok");
  });

  it("only allows same-site redirects after login", () => {
    expect(safeRedirectPath("/admin/people")).toBe("/admin/people");
    expect(safeRedirectPath("https://evil.example")).toBe("/admin");
    expect(safeRedirectPath("//evil.example")).toBe("/admin");
    expect(safeRedirectPath(null)).toBe("/admin");
  });
});

describe("adminAction (every mutation goes through it)", () => {
  it("rejects callers who are not admins without touching the database", async () => {
    const d = deps(null);
    const handler = vi.fn(async () => ok(undefined));
    const action = adminAction(schema, handler, d);
    const result = await action({ firstName: "Marek" });
    expect(result.ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    expect(d.createDb).not.toHaveBeenCalled();
  });

  it("validates input on the server and returns field errors", async () => {
    const handler = vi.fn(async () => ok(undefined));
    const action = adminAction(schema, handler, deps({ userId: "u1", email: "a@b.c" }));
    const result = await action({ firstName: "" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { firstName: "Imię jest wymagane." } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler for admins with parsed data", async () => {
    const handler = vi.fn(async (input: { firstName: string }) => ok({ created: input.firstName }));
    const action = adminAction(schema, handler, deps({ userId: "u1", email: "a@b.c" }));
    const result = await action({ firstName: "Marek" });
    expect(result).toEqual({ ok: true, data: { created: "Marek" }, message: undefined });
  });

  it("never leaks raw errors to the client", async () => {
    const action = adminAction(
      schema,
      async () => {
        throw new Error('relation "people" does not exist at character 15');
      },
      deps({ userId: "u1", email: "a@b.c" }),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await action({ firstName: "Marek" });
    spy.mockRestore();
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("relation");
  });
});

describe("adminOnlyAction (deleting, import)", () => {
  it("refuses moderators before touching the database", async () => {
    const d = deps({ userId: "m1", email: "m@b.c", role: "moderator" });
    const handler = vi.fn(async () => ok(undefined));
    const result = await adminOnlyAction(schema, handler, d)({ firstName: "Marek" });
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/Tylko administrator/) });
    expect(handler).not.toHaveBeenCalled();
    expect(d.createDb).not.toHaveBeenCalled();
  });

  it("lets admins through, and moderators through regular actions", async () => {
    const handler = vi.fn(async () => ok(undefined));
    expect(await adminOnlyAction(schema, handler, deps({ userId: "a1", email: "a@b.c", role: "admin" }))({ firstName: "M" })).toMatchObject({ ok: true });
    expect(await adminAction(schema, handler, deps({ userId: "m1", email: "m@b.c", role: "moderator" }))({ firstName: "M" })).toMatchObject({ ok: true });
  });
});

describe("database error messages", () => {
  it("explains unique and check violations in Polish", () => {
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "relationships_pair_unique"' })).toBe(
      "Ta relacja już istnieje.",
    );
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "people_slug_key"' })).toMatch(/slug/);
    expect(friendlyDbError({ code: "23514", message: 'violates check constraint "relationships_not_self"' })).toMatch(/sama ze sobą/);
    expect(friendlyDbError({ code: "XX000", message: "internal" })).not.toContain("internal");
  });
});
