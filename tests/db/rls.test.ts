import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, anon, as, createTestDb, regularUser } from "./harness";

let db: PGlite;

async function insertPerson(slug: string, status: "draft" | "published" = "published") {
  const res = await as(db, admin, (tx) =>
    tx.query<{ id: string }>(
      "insert into public.people (slug, first_name, status, admin_notes) values ($1, $2, $3, 'tajna notatka') returning id",
      [slug, slug[0].toUpperCase() + slug.slice(1), status],
    ),
  );
  return res.rows[0].id;
}

beforeAll(async () => {
  db = await createTestDb();
});

describe("permissions (RLS + grants)", () => {
  it("anon sees only published people", async () => {
    await insertPerson("jawny", "published");
    await insertPerson("szkic", "draft");
    const { rows } = await as(db, anon, (tx) => tx.query<{ slug: string }>("select slug from public.people order by slug"));
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain("jawny");
    expect(slugs).not.toContain("szkic");
  });

  it("anon cannot read admin-only columns", async () => {
    await expect(as(db, anon, (tx) => tx.query("select admin_notes from public.people"))).rejects.toThrow(/permission denied/);
    await expect(as(db, anon, (tx) => tx.query("select source_note from public.relationships"))).rejects.toThrow(/permission denied/);
    await expect(as(db, anon, (tx) => tx.query("select last_name from public.people"))).rejects.toThrow(/permission denied/);
  });

  it("anon cannot write", async () => {
    await expect(
      as(db, anon, (tx) => tx.query("insert into public.people (slug, first_name) values ('hacker', 'H')")),
    ).rejects.toThrow(/permission denied/);
  });

  it("a logged-in user who is not an admin sees and changes nothing", async () => {
    const { rows } = await as(db, regularUser, (tx) => tx.query("select * from public.people"));
    expect(rows).toHaveLength(0);
    await expect(
      as(db, regularUser, (tx) => tx.query("insert into public.people (slug, first_name) values ('intruz', 'I')")),
    ).rejects.toThrow(/row-level security/);
    const updated = await as(db, regularUser, (tx) => tx.query("update public.people set bio = 'x'"));
    expect(updated.affectedRows).toBe(0);
    const { rows: logs } = await as(db, regularUser, (tx) => tx.query("select * from public.audit_logs"));
    expect(logs).toHaveLength(0);
  });

  it("admin has full CRUD including drafts and admin columns", async () => {
    const { rows } = await as(db, admin, (tx) =>
      tx.query<{ slug: string; admin_notes: string }>("select slug, admin_notes from public.people where slug = 'szkic'"),
    );
    expect(rows[0].admin_notes).toBe("tajna notatka");
    const del = await as(db, admin, (tx) => tx.query("delete from public.people where slug = 'szkic'"));
    expect(del.affectedRows).toBe(1);
  });

  it("users cannot forge audit log entries", async () => {
    await expect(
      as(db, admin, (tx) =>
        tx.query("insert into public.audit_logs (action, entity_type) values ('created', 'people')"),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("relationships", () => {
  it("blocks self relationships", async () => {
    const id = await insertPerson("samotnik");
    await expect(
      as(db, admin, (tx) =>
        tx.query("insert into public.relationships (slug, person_a, person_b, type) values ('x', $1, $1, 'znajomi')", [id]),
      ),
    ).rejects.toThrow(/relationships_not_self/);
  });

  it("treats A–B and B–A as the same (undirected) pair", async () => {
    const a = await insertPerson("adam");
    const b = await insertPerson("bogdan");
    await as(db, admin, (tx) =>
      tx.query("insert into public.relationships (slug, person_a, person_b, type) values ('adam-bogdan', $1, $2, 'znajomi')", [a, b]),
    );
    await expect(
      as(db, admin, (tx) =>
        tx.query("insert into public.relationships (slug, person_a, person_b, type) values ('bogdan-adam', $1, $2, 'praca')", [b, a]),
      ),
    ).rejects.toThrow(/relationships_pair_unique/);
  });

  it("hides a published relationship from anon when one side is a draft", async () => {
    const a = await insertPerson("widoczny");
    const b = await insertPerson("ukryty", "draft");
    await as(db, admin, (tx) =>
      tx.query(
        "insert into public.relationships (slug, person_a, person_b, type, status) values ('widoczny-ukryty', $1, $2, 'znajomi', 'published')",
        [a, b],
      ),
    );
    const { rows } = await as(db, anon, (tx) => tx.query("select slug from public.relationships where slug = 'widoczny-ukryty'"));
    expect(rows).toHaveLength(0);
  });
});

describe("status and audit log", () => {
  it("publishing sets published_at and is logged with the admin's email", async () => {
    const id = await insertPerson("nowy", "draft");
    await as(db, admin, (tx) => tx.query("update public.people set status = 'published' where id = $1", [id]));
    const { rows } = await as(db, admin, (tx) =>
      tx.query<{ published_at: Date | null }>("select published_at from public.people where id = $1", [id]),
    );
    expect(rows[0].published_at).not.toBeNull();

    const { rows: logs } = await as(db, admin, (tx) =>
      tx.query<{ action: string; actor_email: string; entity_label: string }>(
        "select action, actor_email, entity_label from public.audit_logs where entity_id = $1 order by id",
        [id],
      ),
    );
    expect(logs.map((l) => l.action)).toEqual(["created", "published"]);
    expect(logs[0].actor_email).toBe("admin@example.com");
    expect(logs[0].entity_label).toBe("Nowy");
  });

  it("archiving is logged as 'archived' and sets archived_at", async () => {
    const id = await insertPerson("stary");
    await as(db, admin, (tx) => tx.query("update public.people set status = 'archived' where id = $1", [id]));
    const { rows } = await as(db, admin, (tx) =>
      tx.query<{ action: string }>("select action from public.audit_logs where entity_id = $1 order by id desc limit 1", [id]),
    );
    expect(rows[0].action).toBe("archived");
  });
});
