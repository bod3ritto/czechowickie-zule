import type { PGlite } from "@electric-sql/pglite";
import { as } from "./harness";

/**
 * A tiny stand-in for the supabase-js query builder, executed against PGlite
 * as a given API role. It implements only what the admin panel uses
 * (select / insert / update / delete + eq, neq, in, like, or, not, order,
 * limit, single, maybeSingle, head/count), so the real server actions and
 * read queries can run against real Postgres + RLS in tests.
 */

type Who = Parameters<typeof as>[1];
type Result = { data: unknown; error: { code?: string; message: string; details: null } | null; count?: number | null };

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

class Builder implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private cols = "*";
  private payload: Record<string, unknown>[] = [];
  private patch: Record<string, unknown> = {};
  private where: string[] = [];
  private params: unknown[] = [];
  private orderBy: string[] = [];
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private head = false;
  private count = false;
  private returning = false;

  constructor(
    private run: <T>(fn: (tx: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => Promise<T>,
    private table: string,
  ) {}

  private p(value: unknown) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.op === "select") this.cols = cols;
    else this.returning = true;
    if (this.op !== "select") this.cols = cols;
    this.head = Boolean(opts?.head);
    this.count = Boolean(opts?.count);
    return this;
  }
  insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Record<string, unknown>) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, value: unknown) {
    this.where.push(`${q(col)} = ${this.p(value)}`);
    return this;
  }
  neq(col: string, value: unknown) {
    this.where.push(`${q(col)} is distinct from ${this.p(value)}`);
    return this;
  }
  in(col: string, values: unknown[]) {
    this.where.push(`${q(col)} = any(${this.p(values)})`);
    return this;
  }
  like(col: string, pattern: string) {
    this.where.push(`${q(col)} like ${this.p(pattern)}`);
    return this;
  }
  not(col: string, operator: string, value: unknown) {
    if (operator !== "is") throw new Error(`shim: not.${operator} unsupported`);
    this.where.push(`${q(col)} is not ${value === null ? "null" : String(value)}`);
    return this;
  }
  /** Supports `a.eq.x,b.eq.y` and `and(a.eq.x,b.eq.y),and(...)`. */
  or(expr: string) {
    const term = (t: string) => {
      const [col, op, ...rest] = t.split(".");
      if (op !== "eq") throw new Error(`shim: or ${op} unsupported`);
      return `${q(col)} = ${this.p(rest.join("."))}`;
    };
    const groups = expr.match(/and\([^)]*\)|[^,]+/g) ?? [];
    const sql = groups
      .map((g) => (g.startsWith("and(") ? `(${g.slice(4, -1).split(",").map(term).join(" and ")})` : term(g)))
      .join(" or ");
    this.where.push(`(${sql})`);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push(`${q(col)} ${opts?.ascending === false ? "desc" : "asc"}`);
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  private cols_() {
    return this.cols === "*" ? "*" : this.cols.split(",").map((c) => q(c.trim())).join(", ");
  }

  private async exec(): Promise<Result> {
    const t = `public.${q(this.table)}`;
    const w = this.where.length ? ` where ${this.where.join(" and ")}` : "";
    let sql: string;
    if (this.op === "select") {
      const order = this.orderBy.length ? ` order by ${this.orderBy.join(", ")}` : "";
      const lim = this.max !== null ? ` limit ${this.max}` : "";
      sql = `select ${this.cols_()} from ${t}${w}${order}${lim}`;
    } else if (this.op === "insert") {
      const keys = [...new Set(this.payload.flatMap((r) => Object.keys(r)))];
      const values = this.payload.map((r) => `(${keys.map((k) => this.p(encode(r[k]))).join(", ")})`).join(", ");
      sql = `insert into ${t} (${keys.map(q).join(", ")}) values ${values}`;
    } else if (this.op === "update") {
      const sets = Object.entries(this.patch).map(([k, v]) => `${q(k)} = ${this.p(encode(v))}`);
      sql = `update ${t} set ${sets.join(", ")}${w}`;
    } else {
      sql = `delete from ${t}${w}`;
    }
    if (this.op !== "select" && this.returning) sql += ` returning ${this.cols_()}`;

    try {
      const rows = await this.run((tx) => tx.query(sql, this.params).then((r) => r.rows));
      const wantsRows = this.op === "select" || this.returning;
      if (this.head) return { data: null, error: null, count: rows.length };
      if (!wantsRows) return { data: null, error: null };
      if (this.mode === "many") return { data: rows, error: null, count: this.count ? rows.length : null };
      if (rows.length === 1) return { data: rows[0], error: null };
      if (rows.length === 0 && this.mode === "maybe") return { data: null, error: null };
      return { data: null, error: { code: "PGRST116", message: `${rows.length} rows returned`, details: null } };
    } catch (e) {
      const err = e as { code?: string; message: string };
      return { data: null, error: { code: err.code, message: err.message, details: null } };
    }
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ) {
    return this.exec().then(onfulfilled, onrejected);
  }
}

/** Arrays/objects must be sent to pg as JSON text-arrays; keep scalars as-is. */
function encode(v: unknown): unknown {
  if (v === undefined) return null;
  return v;
}

/**
 * A supabase-like client bound to one database role. Each query runs in its
 * own transaction with that role's JWT claims (like one PostgREST request).
 */
export function shimClient(db: PGlite, who: Who) {
  const run = <T,>(fn: (tx: never) => Promise<T>) => as(db, who, (tx) => fn(tx as never));
  return {
    from: (table: string) => new Builder(run as never, table),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const names = Object.keys(args);
      const sql = `select public.${q(fn)}(${names.map((n, i) => `${n} => $${i + 1}${n === "payload" ? "::jsonb" : ""}`).join(", ")}) as r`;
      try {
        const rows = await run((tx: { query: (s: string, p: unknown[]) => Promise<{ rows: { r: unknown }[] }> }) =>
          tx.query(sql, names.map((n) => (n === "payload" ? JSON.stringify(args[n]) : args[n]))),
        );
        return { data: (rows as { rows: { r: unknown }[] }).rows[0].r, error: null };
      } catch (e) {
        return { data: null, error: { code: (e as { code?: string }).code, message: (e as Error).message } };
      }
    },
    auth: { getUser: async () => ({ data: { user: who.role === "anon" ? null : { id: who.id, email: who.email } } }) },
    storage: {
      from: () => ({
        remove: async () => ({ error: null }),
        createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `http://storage.test/${path}`, token: "t", path }, error: null }),
      }),
    },
  };
}
