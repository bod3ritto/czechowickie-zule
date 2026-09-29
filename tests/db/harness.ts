import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * Real Postgres (PGlite/WASM) with the pieces of Supabase the schema relies
 * on: `anon`/`authenticated` roles, `auth.users`, `auth.uid()` and Supabase's
 * default "grant everything" privileges — so RLS and grants are tested as
 * they behave in production.
 */
const BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
`;

export const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export const USER_ID = "00000000-0000-4000-8000-000000000002";

export async function createTestDb({ seed = false } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  // Storage migration needs Supabase's storage schema; everything else runs as in production.
  for (const file of ["20260929000001_schema.sql", "20260930000001_submissions.sql"]) {
    await db.exec(readFileSync(resolve(__dirname, "../../supabase/migrations", file), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN_ID}', 'admin@example.com'),
      ('${USER_ID}', 'user@example.com');
    insert into public.admin_users (user_id, email) values ('${ADMIN_ID}', 'admin@example.com');
  `);
  if (seed) {
    await db.exec(readFileSync(resolve(__dirname, "../../supabase/seed.sql"), "utf8"));
  }
  return db;
}

type Who = { role: "anon" } | { role: "authenticated"; id: string; email: string };

export const anon: Who = { role: "anon" };
export const admin: Who = { role: "authenticated", id: ADMIN_ID, email: "admin@example.com" };
export const regularUser: Who = { role: "authenticated", id: USER_ID, email: "user@example.com" };

/** Runs `fn` as the given API role, like a PostgREST request with that JWT. */
export async function as<T>(db: PGlite, who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = who.role === "anon" ? { role: "anon" } : { role: "authenticated", sub: who.id, email: who.email };
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${who.role}`);
    return fn(tx);
  });
}
