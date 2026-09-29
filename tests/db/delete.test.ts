import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, as, createTestDb } from "./harness";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb({ seed: true });
});

describe("deleting people", () => {
  it("lets an admin delete a well-connected person together with their relationships", async () => {
    const before = await as(db, admin, (tx) => tx.query<{ n: number }>("select count(*)::int n from public.relationships"));
    const rels = await as(db, admin, (tx) =>
      tx.query<{ n: number }>(
        "select count(*)::int n from public.relationships r join public.people p on p.id in (r.person_a, r.person_b) where p.slug = 'marek'",
      ),
    );
    expect(rels.rows[0].n).toBeGreaterThan(5);

    const del = await as(db, admin, (tx) => tx.query("delete from public.people where slug = 'marek'"));
    expect(del.affectedRows).toBe(1);

    const after = await as(db, admin, (tx) => tx.query<{ n: number }>("select count(*)::int n from public.relationships"));
    expect(after.rows[0].n).toBe(before.rows[0].n - rels.rows[0].n);
  });

  it("deletes several people at once (bulk) and logs each deletion", async () => {
    const del = await as(db, admin, (tx) => tx.query("delete from public.people where slug in ('krzychu', 'lysy', 'arek')"));
    expect(del.affectedRows).toBe(3);
    const logs = await as(db, admin, (tx) =>
      tx.query<{ n: number }>("select count(*)::int n from public.audit_logs where action = 'deleted' and entity_type = 'people'"),
    );
    expect(logs.rows[0].n).toBeGreaterThanOrEqual(4);
  });
});
