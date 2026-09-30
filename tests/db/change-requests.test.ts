import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, anon, as, createTestDb, regularUser } from "./harness";

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb({ seed: true });
});

const request = (args: { kind: string; message?: string | null; person?: string | null; relationship?: string | null; contact?: string | null }) =>
  as(db, anon, (tx) =>
    tx.query("select public.submit_change_request(kind => $1, message => $2, person => $3, relationship => $4, contact => $5) as r", [
      args.kind,
      args.message ?? null,
      args.person ?? null,
      args.relationship ?? null,
      args.contact ?? null,
    ]),
  );
const rows = async () =>
  (await db.query<{ kind: string; target_label: string; message: string; person_id: string | null; relationship_id: string | null; status: string }>(
    "select * from public.change_requests order by created_at",
  )).rows;

describe("change requests", () => {
  it("anon can ask for a correction to a person or a relationship", async () => {
    await request({ kind: "correction", person: "marek", message: "Ma inną ksywkę", contact: "marek@example.com" });
    const rel = (await db.query<{ slug: string }>("select slug from public.relationships where status = 'published' limit 1")).rows[0].slug;
    await request({ kind: "correction", relationship: rel, message: "Nie znają się" });
    const [a, b] = await rows();
    expect(a).toMatchObject({ kind: "correction", target_label: "Marek „Szef”", message: "Ma inną ksywkę", status: "open" });
    expect(a.person_id).not.toBeNull();
    expect(b.relationship_id).not.toBeNull();
    expect(b.target_label).toContain("↔");
  });

  it("a removal request needs no message", async () => {
    await request({ kind: "removal", person: "kuba" });
    expect((await rows())[0]).toMatchObject({ kind: "removal", message: "Proszę o usunięcie mnie z mapy." });
  });

  it("rejects invalid requests", async () => {
    await expect(request({ kind: "correction", person: "marek" })).rejects.toThrow(/submission_missing:message/);
    await expect(request({ kind: "correction", message: "x" })).rejects.toThrow(/submission_missing:target/);
    await expect(request({ kind: "correction", message: "x", person: "marek", relationship: "marek-ewka" })).rejects.toThrow(/submission_missing:target/);
    await expect(request({ kind: "removal", relationship: "marek-ewka" })).rejects.toThrow(/submission_missing:target/);
    await expect(request({ kind: "hack", person: "marek" })).rejects.toThrow(/submission_missing:kind/);
    await expect(request({ kind: "correction", person: "nie-ma", message: "x" })).rejects.toThrow(/submission_person_not_found/);
    await expect(request({ kind: "correction", person: "marek", message: "x".repeat(1001) })).rejects.toThrow(/submission_too_long:message/);
  });

  it("cannot target drafts (they are not on the public map)", async () => {
    await as(db, admin, (tx) => tx.query("update public.people set status = 'draft' where slug = 'kuba'"));
    await expect(request({ kind: "removal", person: "kuba" })).rejects.toThrow(/submission_person_not_found/);
  });

  it("caps the number of requests per hour", async () => {
    for (let i = 0; i < 30; i++) await request({ kind: "correction", person: "marek", message: `#${i}` });
    await expect(request({ kind: "correction", person: "marek", message: "one more" })).rejects.toThrow(/submission_rate_limit/);
  });

  it("only admins can read or change requests", async () => {
    await request({ kind: "removal", person: "kuba" });
    await expect(as(db, anon, (tx) => tx.query("select * from public.change_requests"))).rejects.toThrow(/permission denied/);
    await expect(as(db, anon, (tx) => tx.query("insert into public.change_requests (kind, target_label, message) values ('removal', 'x', 'x')"))).rejects.toThrow(
      /permission denied/,
    );
    const seen = await as(db, regularUser, (tx) => tx.query("select * from public.change_requests"));
    expect(seen.rows).toHaveLength(0);
    const admins = await as(db, admin, (tx) => tx.query("select * from public.change_requests"));
    expect(admins.rows).toHaveLength(1);
  });

  it("keeps the request (with its label) when the person is deleted, and stamps resolved_at", async () => {
    await request({ kind: "removal", person: "kuba" });
    await as(db, admin, (tx) => tx.query("delete from public.people where slug = 'kuba'"));
    await as(db, admin, (tx) => tx.query("update public.change_requests set status = 'resolved'"));
    const r = (await db.query<{ person_id: string | null; target_label: string; resolved_at: string | null }>("select * from public.change_requests")).rows[0];
    expect(r).toMatchObject({ person_id: null, target_label: "Kuba „Kubson”" });
    expect(r.resolved_at).not.toBeNull();
  });
});
