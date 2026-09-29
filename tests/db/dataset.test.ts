import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, anon, as, createTestDb, regularUser } from "./harness";
import { datasetSchema, toDataset } from "@/lib/data/public-dataset-schema";
import { validateDataset } from "@/lib/data/validate";

let db: PGlite;

async function dataset(who: typeof anon, includeDrafts = false) {
  const { rows } = await as(db, who, (tx) =>
    tx.query<{ data: unknown }>("select public.public_dataset($1) as data", [includeDrafts]),
  );
  return toDataset(datasetSchema.parse(rows[0].data), (path) => path);
}

beforeAll(async () => {
  db = await createTestDb({ seed: true });
});

describe("seed + public_dataset()", () => {
  it("loads the seed and returns a valid public dataset for anon", async () => {
    const data = await dataset(anon);
    expect(data.people).toHaveLength(20);
    expect(data.relationships.length).toBeGreaterThanOrEqual(40);
    expect(data.events.length).toBeGreaterThan(10);
    expect(data.lore.length).toBeGreaterThan(10);
    expect(validateDataset(data)).toEqual([]);
  });

  it("uses slugs as public ids and never leaks admin fields", async () => {
    const data = await dataset(anon);
    const marek = data.people.find((p) => p.id === "marek");
    expect(marek?.name).toBe("Marek");
    const json = JSON.stringify(data);
    for (const field of ["source_note", "sourceNote", "admin_notes", "last_name", "birth_date"]) {
      expect(json).not.toContain(field);
    }
  });

  it("excludes drafts for anon even when drafts are requested", async () => {
    const withDrafts = await dataset(anon, true);
    expect(withDrafts.events.some((e) => e.title === "Biznes rowerowy")).toBe(false);
  });

  it("includes drafts only for admins in preview", async () => {
    const preview = await dataset(admin, true);
    expect(preview.events.some((e) => e.title === "Biznes rowerowy")).toBe(true);
    const normal = await dataset(admin, false);
    expect(normal.events.some((e) => e.title === "Biznes rowerowy")).toBe(false);
  });

  it("hides relationships of unpublished people", async () => {
    await as(db, admin, (tx) => tx.query("update public.people set status = 'draft' where slug = 'dawid'"));
    const data = await dataset(anon);
    expect(data.people.some((p) => p.id === "dawid")).toBe(false);
    expect(data.relationships.some((r) => r.personA === "dawid" || r.personB === "dawid")).toBe(false);
    expect(data.events.every((e) => !e.people.includes("dawid"))).toBe(true);
    expect(validateDataset(data)).toEqual([]);
    await as(db, admin, (tx) => tx.query("update public.people set status = 'published' where slug = 'dawid'"));
  });
});

describe("admin_import()", () => {
  it("is forbidden for non-admins", async () => {
    await expect(
      as(db, regularUser, (tx) => tx.query("select public.admin_import('{}'::jsonb, 'merge')")),
    ).rejects.toThrow(/forbidden/);
  });

  it("merges new rows, skips existing ones and logs one 'imported' entry", async () => {
    const payload = {
      people: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "importowany",
          first_name: "Importowany",
          aliases: [],
          bio: "",
          category: "bywalec",
          tags: [],
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    const { rows } = await as(db, admin, (tx) =>
      tx.query<{ counts: { people: number } }>("select public.admin_import($1::jsonb, 'merge') as counts", [JSON.stringify(payload)]),
    );
    expect(rows[0].counts.people).toBe(21);
    const { rows: logs } = await as(db, admin, (tx) =>
      tx.query<{ action: string }>("select action from public.audit_logs order by id desc limit 1"),
    );
    expect(logs[0].action).toBe("imported");
  });
});
