import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { admin, anon, as, createTestDb } from "./harness";

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb({ seed: true });
});

const submitPerson = (args: Record<string, unknown>) =>
  as(db, anon, (tx) =>
    tx.query(
      `select public.submit_person(first_name => $1, nickname => $2, bio => $3, related_to => $4,
         related_type => $5::public.relationship_type, related_description => $6, submitted_by => $7) as r`,
      [args.first_name, args.nickname ?? null, args.bio ?? null, args.related_to ?? null, args.related_type ?? null, args.related_description ?? null, args.submitted_by ?? null],
    ),
  );
const submitRel = (a: string, b: string, type = "znajomi", since: number | null = null) =>
  as(db, anon, (tx) =>
    tx.query("select public.submit_relationship(person_a => $1, person_b => $2, type => $3::public.relationship_type, since_year => $4) as r", [a, b, type, since]),
  );
const one = async <T,>(sql: string) => (await db.query<T>(sql)).rows[0];

describe("public submissions", () => {
  it("anon can submit a person; it lands as a hidden draft marked as submitted", async () => {
    await submitPerson({ first_name: "  Zenek ", nickname: "Żółw", bio: "Nowy", submitted_by: "Kolega" });
    const row = await one<{ slug: string; status: string; submitted_at: string | null; submitted_by: string; first_name: string }>(
      "select * from public.people where first_name = 'Zenek'",
    );
    expect(row).toMatchObject({ slug: "zenek-zolw", status: "draft", submitted_by: "Kolega" });
    expect(row.submitted_at).not.toBeNull();

    const visible = await as(db, anon, (tx) => tx.query("select 1 from public.people where first_name = 'Zenek'"));
    expect(visible.rows).toHaveLength(0);
  });

  it("gives colliding names a unique slug", async () => {
    await submitPerson({ first_name: "Marek" });
    await submitPerson({ first_name: "Marek" });
    const { rows } = await db.query<{ slug: string }>("select slug from public.people where first_name = 'Marek' order by slug");
    expect(rows.map((r) => r.slug)).toEqual(["marek", "marek-2", "marek-3"]);
  });

  it("can link the new person to someone on the map", async () => {
    await submitPerson({ first_name: "Zenek", related_to: "marek", related_type: "sport", related_description: "Grają w piłkę" });
    const rel = await one<{ status: string; source_type: string; type: string; description: string }>(
      "select r.* from public.relationships r join public.people p on p.id in (r.person_a, r.person_b) where p.first_name = 'Zenek'",
    );
    expect(rel).toMatchObject({ status: "draft", source_type: "submitted", type: "sport", description: "Grają w piłkę" });
  });

  it("anon can submit a relationship between two published people", async () => {
    await submitRel("rafal", "dawid", "praca", 2020);
    const rel = await one<{ status: string; since_year: number; slug: string }>(
      "select * from public.relationships where slug = 'rafal-dawid'",
    );
    expect(rel).toMatchObject({ status: "draft", since_year: 2020 });
  });

  it("rejects bad input with readable error codes", async () => {
    await expect(submitPerson({ first_name: "  " })).rejects.toThrow(/submission_missing:first_name/);
    await expect(submitPerson({ first_name: "x".repeat(81) })).rejects.toThrow(/submission_too_long:first_name/);
    await expect(submitPerson({ first_name: "Z", related_to: "nie-istnieje", related_type: "sport" })).rejects.toThrow(/submission_person_not_found/);
    await expect(submitRel("marek", "marek")).rejects.toThrow(/submission_self_relationship/);
    await expect(submitRel("marek", "nie-istnieje")).rejects.toThrow(/submission_person_not_found/);
    await expect(submitRel("rafal", "dawid", "praca", 1800)).rejects.toThrow(/submission_invalid_year/);
    // An existing pair, in either direction.
    const pair = await one<{ a: string; b: string }>(
      "select pa.slug a, pb.slug b from public.relationships r join public.people pa on pa.id = r.person_a join public.people pb on pb.id = r.person_b limit 1",
    );
    await expect(submitRel(pair.b, pair.a)).rejects.toThrow(/submission_relationship_exists/);
  });

  it("cannot link to or through draft people", async () => {
    await submitPerson({ first_name: "Szkic" });
    const draft = await one<{ slug: string }>("select slug from public.people where first_name = 'Szkic'");
    await expect(submitRel("marek", draft.slug)).rejects.toThrow(/submission_person_not_found/);
  });

  it("caps the number of submissions per hour", async () => {
    for (let i = 0; i < 30; i++) await submitPerson({ first_name: `Spam ${i}` });
    await expect(submitPerson({ first_name: "Jeszcze jeden" })).rejects.toThrow(/submission_rate_limit/);
  });

  it("anon cannot call the internal helpers or write tables directly", async () => {
    await expect(as(db, anon, (tx) => tx.query("select public.check_submission_quota()"))).rejects.toThrow(/permission denied/);
    await expect(
      as(db, anon, (tx) => tx.query("select public.insert_submitted_relationship(gen_random_uuid(), gen_random_uuid(), 'znajomi', '', null, null)")),
    ).rejects.toThrow(/permission denied/);
    await expect(as(db, anon, (tx) => tx.query("update public.people set status = 'published'"))).rejects.toThrow(/permission denied/);
  });

  it("an admin approves a submission by publishing it", async () => {
    await submitPerson({ first_name: "Zenek", related_to: "marek", related_type: "sport" });
    await as(db, admin, (tx) => tx.query("update public.people set status = 'published' where first_name = 'Zenek'"));
    await as(db, admin, (tx) => tx.query("update public.relationships set status = 'published' where submitted_at is not null"));
    const seen = await as(db, anon, (tx) =>
      tx.query("select 1 from public.relationships r join public.people p on p.id in (r.person_a, r.person_b) where p.first_name = 'Zenek'"),
    );
    expect(seen.rows).toHaveLength(1);
  });
});
