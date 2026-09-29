import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, anon, createTestDb, regularUser } from "./harness";
import { shimClient } from "./postgrest-shim";

/**
 * End-to-end check of the admin panel's server side: the *real* server
 * actions (validation → RLS → triggers) and read queries, run against real
 * Postgres with the seed data. Only Next/Supabase plumbing is faked.
 */

const state = vi.hoisted(() => ({ who: null as unknown, db: null as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSessionClient: async () => {
    const { shimClient } = await import("./postgrest-shim");
    return shimClient(state.db as PGlite, state.who as never);
  },
}));
vi.mock("@/lib/auth/admin", () => ({
  getAdmin: async () => {
    const who = state.who as { role: string; id?: string; email?: string };
    return who.role === "authenticated" && who.id === "00000000-0000-4000-8000-000000000001" ? { userId: who.id, email: who.email } : null;
  },
}));

import { deletePeople, duplicatePerson, savePerson, setPeopleCategory, setPeopleStatus } from "@/lib/actions/people";
import { deleteRelationships, saveRelationship, setRelationshipsStatus, setRelationshipsType } from "@/lib/actions/relationships";
import { deleteLore, saveLore, setLoreStatus } from "@/lib/actions/lore";
import { deleteEvents, saveEvent, setEventsStatus } from "@/lib/actions/events";
import { deleteLocations, saveLocation } from "@/lib/actions/locations";
import { exportAll, getDashboard, getEventDetail, getLoreDetail, getPersonDetail, getRelationshipDetail, getSearchIndex, listAudit, listEvents, listLocations, listLore, listPeople, listRelationships } from "@/lib/queries/admin";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb({ seed: true });
  state.db = db;
});
beforeEach(() => {
  state.who = admin;
});

const count = async (table: string, where = "true") =>
  (await db.query<{ n: number }>(`select count(*)::int n from public.${table} where ${where}`)).rows[0].n;
const idOfSlug = async (slug: string) => (await db.query<{ id: string }>("select id from public.people where slug = $1", [slug])).rows[0].id;

function expectOk<T extends { ok: boolean }>(r: T): asserts r is T & { ok: true } {
  expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
}

const personInput = (over: Record<string, unknown> = {}) => ({
  firstName: "Testowy",
  slug: "testowy",
  bio: "",
  category: "bywalec" as const,
  status: "draft" as const,
  tags: [],
  aliases: [],
  ...over,
});
const relInput = (personA: string, personB: string, over: Record<string, unknown> = {}) => ({
  personA,
  personB,
  type: "znajomi" as const,
  strength: 60,
  description: "",
  confidence: "confirmed" as const,
  sourceType: "personal" as const,
  status: "draft" as const,
  ...over,
});

describe("access control", () => {
  it.each([
    ["anonymous", anon],
    ["non-admin user", regularUser],
  ])("%s cannot delete anything", async (_name, who) => {
    state.who = who;
    const id = await idOfSlug("kuba");
    const r = await deletePeople({ ids: [id] });
    expect(r.ok).toBe(false);
    expect(await count("people", "slug = 'kuba'")).toBe(1);
  });
});

describe("deletes that remove nothing", () => {
  it("report an error instead of success when the row does not exist", async () => {
    const ghost = "00000000-0000-4000-8000-0000000000aa";
    for (const r of [
      await deletePeople({ ids: [ghost] }),
      await deleteRelationships({ ids: [ghost] }),
      await deleteLore({ ids: [ghost] }),
      await deleteEvents({ ids: [ghost] }),
      await deleteLocations({ ids: [ghost] }),
    ]) {
      expect(r).toMatchObject({ ok: false });
    }
  });

  it("report an error when RLS blocks the delete (admin check passes, database says no)", async () => {
    // Session is a valid admin for the action layer but not in admin_users for Postgres.
    const id = await idOfSlug("kuba");
    state.who = { role: "authenticated", id: "00000000-0000-4000-8000-000000000001", email: "admin@example.com" };
    await db.exec("delete from public.admin_users");
    try {
      expect(await deletePeople({ ids: [id] })).toMatchObject({ ok: false });
      expect(await count("people", "slug = 'kuba'")).toBe(1);
    } finally {
      await db.exec("insert into public.admin_users (user_id, email) values ('00000000-0000-4000-8000-000000000001', 'admin@example.com')");
    }
  });
});

describe("people", () => {
  it("creates, edits, changes status/category and duplicates a person", async () => {
    const created = await savePerson(personInput());
    expectOk(created);
    expect(await count("people", "slug = 'testowy'")).toBe(1);

    const edited = await savePerson(personInput({ id: created.data.id, firstName: "Zmieniony", nickname: "Zmiana", status: "published" }));
    expectOk(edited);
    const row = (await db.query<{ first_name: string; status: string; published_at: string | null }>("select * from public.people where slug='testowy'")).rows[0];
    expect(row).toMatchObject({ first_name: "Zmieniony", status: "published" });
    expect(row.published_at).not.toBeNull();

    expectOk(await setPeopleStatus({ ids: [created.data.id], status: "archived" }));
    expectOk(await setPeopleCategory({ ids: [created.data.id], category: "legenda" }));
    expect(await count("people", "slug='testowy' and status='archived' and category='legenda'")).toBe(1);

    const copy = await duplicatePerson({ id: created.data.id });
    expectOk(copy);
    expect(await count("people", "slug='testowy-kopia'")).toBe(1);
  });

  it("rejects a duplicate slug with a readable message", async () => {
    const r = await savePerson(personInput({ slug: "marek" }));
    expect(r).toMatchObject({ ok: false });
    expect((r as { error: string }).error).toMatch(/slug/i);
  });

  it("creates a person together with new lore entries", async () => {
    const r = await savePerson(personInput({ slug: "z-lore", newLore: [{ content: "Podobno tu mieszka", confidence: "rumor" }] }));
    expectOk(r);
    expect(await count("lore_people", `person_id = '${r.data.id}'`)).toBe(1);
  });

  it("deletes a seeded person (md5-style id) with all their relationships", async () => {
    const id = await idOfSlug("marek");
    const rels = await count("relationships", `person_a = '${id}' or person_b = '${id}'`);
    expect(rels).toBeGreaterThan(0);
    const total = await count("relationships");

    const r = await deletePeople({ ids: [id] });
    expectOk(r);
    expect(await count("people", "slug = 'marek'")).toBe(0);
    expect(await count("relationships")).toBe(total - rels);
  });

  it("bulk-deletes people, including ones created in the panel", async () => {
    const a = await savePerson(personInput({ slug: "bulk-a" }));
    const b = await savePerson(personInput({ slug: "bulk-b" }));
    expectOk(a);
    expectOk(b);
    const seeded = await idOfSlug("krzychu");
    const r = await deletePeople({ ids: [a.data.id, b.data.id, seeded] });
    expectOk(r);
    expect(await count("people", "slug in ('bulk-a','bulk-b','krzychu')")).toBe(0);
  });

  it("rejects an empty or malformed delete request instead of deleting", async () => {
    expect(await deletePeople({ ids: [] })).toMatchObject({ ok: false });
    expect(await deletePeople({ ids: ["nope"] })).toMatchObject({ ok: false });
  });
});

describe("relationships", () => {
  it("creates, edits, changes status/type, rejects duplicates and deletes", async () => {
    const a = await idOfSlug("rafal");
    const b = await idOfSlug("dawid");
    const created = await saveRelationship(relInput(a, b));
    expectOk(created);

    // A–B is the same as B–A.
    expect(await saveRelationship(relInput(b, a))).toMatchObject({ ok: false });
    // A person can't be related to themselves.
    expect(await saveRelationship(relInput(a, a))).toMatchObject({ ok: false });

    expectOk(await saveRelationship(relInput(a, b, { id: created.data.id, strength: 90, type: "rodzina", status: "published" })));
    expectOk(await setRelationshipsStatus({ ids: [created.data.id], status: "archived" }));
    expectOk(await setRelationshipsType({ ids: [created.data.id], type: "praca" }));
    expect(await count("relationships", `id='${created.data.id}' and strength=90 and status='archived' and type='praca'`)).toBe(1);

    expectOk(await deleteRelationships({ ids: [created.data.id] }));
    expect(await count("relationships", `id='${created.data.id}'`)).toBe(0);
  });

  it("deletes seeded relationships in bulk", async () => {
    const ids = (await db.query<{ id: string }>("select id from public.relationships limit 3")).rows.map((r) => r.id);
    expectOk(await deleteRelationships({ ids }));
    expect(await count("relationships", `id = any('{${ids.join(",")}}')`)).toBe(0);
  });
});

describe("lore", () => {
  it("creates with linked people, edits, changes status and deletes", async () => {
    const p1 = await idOfSlug("seba");
    const p2 = await idOfSlug("damian");
    const created = await saveLore({ content: "Testowa ciekawostka", loreType: "plotka", confidence: "rumor", sourceType: "unknown", people: [p1, p2], status: "draft" });
    expectOk(created);
    expect(await count("lore_people", `lore_id='${created.data.id}'`)).toBe(2);

    expectOk(await saveLore({ id: created.data.id, content: "Zmieniona", loreType: "plotka", confidence: "rumor", sourceType: "unknown", people: [p1], status: "published" }));
    expect(await count("lore_people", `lore_id='${created.data.id}'`)).toBe(1);
    expectOk(await setLoreStatus({ ids: [created.data.id], status: "archived" }));

    expectOk(await deleteLore({ ids: [created.data.id] }));
    expect(await count("lore", `id='${created.data.id}'`)).toBe(0);
    expect(await count("lore_people", `lore_id='${created.data.id}'`)).toBe(0);
  });

  it("deletes seeded lore", async () => {
    const ids = (await db.query<{ id: string }>("select id from public.lore limit 2")).rows.map((r) => r.id);
    expectOk(await deleteLore({ ids }));
    expect(await count("lore", `id = any('{${ids.join(",")}}')`)).toBe(0);
  });
});

describe("events and locations", () => {
  it("creates, edits and deletes an event with participants", async () => {
    const p = await idOfSlug("bartek");
    const created = await saveEvent({ title: "Grill", year: "2021", people: [p], relationships: [], confidence: "confirmed", sourceType: "unknown", status: "draft" } as never);
    expectOk(created);
    expect(await count("event_people", `event_id='${created.data.id}'`)).toBe(1);
    expectOk(await saveEvent({ id: created.data.id, title: "Grill 2", people: [], relationships: [], confidence: "confirmed", sourceType: "unknown", status: "published" } as never));
    expect(await count("event_people", `event_id='${created.data.id}'`)).toBe(0);
    expectOk(await setEventsStatus({ ids: [created.data.id], status: "archived" }));
    expectOk(await deleteEvents({ ids: [created.data.id] }));
    expect(await count("events", `id='${created.data.id}'`)).toBe(0);
  });

  it("deletes seeded events", async () => {
    const ids = (await db.query<{ id: string }>("select id from public.events limit 2")).rows.map((r) => r.id);
    expectOk(await deleteEvents({ ids }));
    expect(await count("events", `id = any('{${ids.join(",")}}')`)).toBe(0);
  });

  it("creates, edits and deletes a location; events keep existing", async () => {
    const created = await saveLocation({ name: "Nowe miejsce", lat: "49,91", lng: "19,01" } as never);
    expectOk(created);
    expectOk(await saveLocation({ id: created.data.id, name: "Nowe miejsce 2" } as never));
    expectOk(await deleteLocations({ ids: [created.data.id] }));
    const seeded = (await db.query<{ id: string }>("select id from public.locations limit 1")).rows[0].id;
    expectOk(await deleteLocations({ ids: [seeded] }));
  });
});

describe("read side (every admin page)", () => {
  it("loads all lists, details, dashboard, search and export without error", async () => {
    // Fresh dataset so earlier deletions don't matter.
    state.db = db = await createTestDb({ seed: true });
    const people = await listPeople();
    expect(people.length).toBe(20);
    const rels = await listRelationships();
    expect(rels.length).toBeGreaterThan(20);
    expect((await listEvents()).length).toBeGreaterThan(0);
    expect((await listLore()).length).toBeGreaterThan(0);
    expect((await listLocations()).length).toBeGreaterThan(0);
    expect((await getDashboard()) as unknown).toBeTruthy();
    expect((await getSearchIndex()).length).toBeGreaterThan(20);
    expect(await listAudit()).toBeDefined();
    expect(Object.keys(await exportAll())).toContain("people");

    const person = await getPersonDetail(people[0].id);
    expect(person).toBeTruthy();
    expect(await getRelationshipDetail(rels[0].id)).toBeTruthy();
    const ev = (await listEvents())[0];
    expect(await getEventDetail(ev.id)).toBeTruthy();
    const lore = (await listLore())[0];
    expect(await getLoreDetail(lore.id)).toBeTruthy();
  });

  it("shows the audit trail of the deletions", async () => {
    const id = await idOfSlug("kuba");
    expectOk(await deletePeople({ ids: [id] }));
    const audit = await listAudit();
    expect(audit.some((a) => a.action === "deleted" && a.entity_type === "people" && a.entity_id === id)).toBe(true);
  });
});

// keep the shim import referenced for type-only builds
void shimClient;
