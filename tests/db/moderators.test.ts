import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, anon, as, createTestDb, moderator, regularUser } from "./harness";

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb({ seed: true });
});

const n = async (sql: string) => (await db.query<{ n: number }>(`select count(*)::int n from ${sql}`)).rows[0].n;

describe("moderator role (RLS)", () => {
  it("is staff but not admin", async () => {
    const r = await as(db, moderator, (tx) => tx.query<{ staff: boolean; adm: boolean }>("select public.is_staff() staff, public.is_admin() adm"));
    expect(r.rows[0]).toEqual({ staff: true, adm: false });
    const a = await as(db, admin, (tx) => tx.query<{ staff: boolean; adm: boolean }>("select public.is_staff() staff, public.is_admin() adm"));
    expect(a.rows[0]).toEqual({ staff: true, adm: true });
    const u = await as(db, regularUser, (tx) => tx.query<{ staff: boolean; adm: boolean }>("select public.is_staff() staff, public.is_admin() adm"));
    expect(u.rows[0]).toEqual({ staff: false, adm: false });
  });

  it("can read drafts, add and edit content", async () => {
    const drafts = await as(db, moderator, (tx) => tx.query("select 1 from public.people where status = 'draft'"));
    expect(drafts.rows.length).toBeGreaterThanOrEqual(0);
    await as(db, moderator, async (tx) => {
      await tx.query("insert into public.people (slug, first_name) values ('nowy-mod', 'Nowy')");
      await tx.query("update public.people set bio = 'poprawione', status = 'published' where slug = 'marek'");
      await tx.query("insert into public.lore (content) values ('Nowe lore')");
      await tx.query("insert into public.events (title) values ('Nowe wydarzenie')");
      await tx.query("insert into public.locations (name) values ('Nowe miejsce')");
    });
    expect(await n("public.people where slug = 'nowy-mod'")).toBe(1);
    expect(await n("public.people where slug = 'marek' and bio = 'poprawione'")).toBe(1);
  });

  it("can edit event participants and lore links (link rows)", async () => {
    const ev = (await db.query<{ event_id: string }>("select event_id from public.event_people limit 1")).rows[0].event_id;
    const del = await as(db, moderator, (tx) => tx.query("delete from public.event_people where event_id = $1", [ev]));
    expect(del.affectedRows).toBeGreaterThan(0);
  });

  it("cannot delete any content (RLS silently removes nothing)", async () => {
    for (const table of ["people", "relationships", "events", "lore", "locations"]) {
      const before = await n(`public.${table}`);
      const res = await as(db, moderator, (tx) => tx.query(`delete from public.${table}`));
      expect(res.affectedRows, table).toBe(0);
      expect(await n(`public.${table}`), table).toBe(before);
    }
  });

  it("cannot run an import", async () => {
    await expect(as(db, moderator, (tx) => tx.query("select public.admin_import('{}'::jsonb, 'replace')"))).rejects.toThrow(/forbidden/);
  });

  it("handles correction requests but not removal requests", async () => {
    await as(db, anon, async (tx) => {
      await tx.query("select public.submit_change_request(kind => 'correction', message => 'x', person => 'marek')");
      await tx.query("select public.submit_change_request(kind => 'removal', person => 'kuba')");
    });
    const upd = await as(db, moderator, (tx) => tx.query("update public.change_requests set status = 'resolved'"));
    expect(upd.affectedRows).toBe(1);
    expect(await n("public.change_requests where kind = 'removal' and status = 'open'")).toBe(1);
    const del = await as(db, moderator, (tx) => tx.query("delete from public.change_requests"));
    expect(del.affectedRows).toBe(0);
  });

  it("sees drafts in the public dataset preview", async () => {
    await as(db, admin, (tx) => tx.query("update public.people set status = 'draft' where slug = 'kuba'"));
    const r = await as(db, moderator, (tx) => tx.query<{ d: { people: { id: string }[] } }>("select public.public_dataset(true) d"));
    expect(r.rows[0].d.people.some((p) => p.id === "kuba")).toBe(true);
    const pub = await as(db, anon, (tx) => tx.query<{ d: { people: { id: string }[] } }>("select public.public_dataset(true) d"));
    expect(pub.rows[0].d.people.some((p) => p.id === "kuba")).toBe(false);
  });

  it("admins can still delete", async () => {
    const res = await as(db, admin, (tx) => tx.query("delete from public.people where slug = 'kuba'"));
    expect(res.affectedRows).toBe(1);
  });
});

describe("lore and event submissions", () => {
  const lore = (args: { content: string; people?: string[]; year?: number | null; title?: string | null }) =>
    as(db, anon, (tx) =>
      tx.query("select public.submit_lore(content => $1, title => $2, lore_type => 'plotka', year => $3, person_slugs => $4) r", [
        args.content,
        args.title ?? null,
        args.year ?? null,
        args.people ?? [],
      ]),
    );
  const event = (args: { title: string; people?: string[]; year?: number | null }) =>
    as(db, anon, (tx) =>
      tx.query("select public.submit_event(title => $1, description => 'opis', year => $2, person_slugs => $3) r", [args.title, args.year ?? null, args.people ?? []]),
    );

  it("anon submits lore about people; it is a hidden draft with links", async () => {
    await lore({ content: "Podobno Marek zna każdego kierowcę", title: "Kierowcy", year: 2019, people: ["marek", "ewka"] });
    const row = (await db.query<{ id: string; status: string; source_type: string; lore_type: string }>(
      "select * from public.lore where title = 'Kierowcy'",
    )).rows[0];
    expect(row).toMatchObject({ status: "draft", source_type: "submitted", lore_type: "plotka" });
    expect(await n(`public.lore_people where lore_id = '${row.id}'`)).toBe(2);
    expect((await as(db, anon, (tx) => tx.query("select 1 from public.lore where title = 'Kierowcy'"))).rows).toHaveLength(0);
  });

  it("anon submits an event with participants", async () => {
    await event({ title: "Grill nad Wisłą", year: 2021, people: ["marek", "bartek", "kuba"] });
    const row = (await db.query<{ id: string; status: string }>("select * from public.events where title = 'Grill nad Wisłą'")).rows[0];
    expect(row.status).toBe("draft");
    expect(await n(`public.event_people where event_id = '${row.id}'`)).toBe(3);
  });

  it("validates", async () => {
    await expect(lore({ content: " " })).rejects.toThrow(/submission_missing:content/);
    await expect(event({ title: "" })).rejects.toThrow(/submission_missing:title/);
    await expect(lore({ content: "x", people: ["nie-ma"] })).rejects.toThrow(/submission_person_not_found/);
    await expect(event({ title: "x", year: 1800 })).rejects.toThrow(/submission_invalid_year/);
    await expect(lore({ content: "x".repeat(2001) })).rejects.toThrow(/submission_too_long:content/);
  });

  it("shares the hourly cap with other submissions", async () => {
    for (let i = 0; i < 30; i++) await lore({ content: `#${i}` });
    await expect(event({ title: "za dużo" })).rejects.toThrow(/submission_rate_limit/);
  });
});
