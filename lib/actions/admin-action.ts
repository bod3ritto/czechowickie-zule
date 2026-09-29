import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getAdmin, type AdminSession } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { fail, friendlyDbError, zodFieldErrors, type ActionResult } from "./result";

export type AdminDb = Awaited<ReturnType<typeof createSessionClient>>;

export interface AdminContext {
  admin: AdminSession;
  db: AdminDb;
}

export interface AdminActionDeps {
  getAdmin: () => Promise<AdminSession | null>;
  createDb: () => Promise<AdminDb>;
}

const defaultDeps: AdminActionDeps = { getAdmin, createDb: createSessionClient };

/**
 * Wraps every admin mutation:
 *   1. server-side admin check (never trust the client),
 *   2. Zod validation of the raw input,
 *   3. the handler, running with the admin's own session so Postgres RLS
 *      is a second, independent line of defence.
 * Unexpected errors are logged and turned into a generic message.
 */
export function adminAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.output<S>, ctx: AdminContext) => Promise<ActionResult<T>>,
  deps: AdminActionDeps = defaultDeps,
) {
  return async (raw: z.input<S>): Promise<ActionResult<T>> => {
    const admin = await deps.getAdmin();
    if (!admin) return fail("Brak uprawnień. Zaloguj się ponownie jako administrator.");

    const parsed = schema.safeParse(raw);
    if (!parsed.success) return fail("Popraw zaznaczone pola.", zodFieldErrors(parsed.error));

    try {
      return await handler(parsed.data, { admin, db: await deps.createDb() });
    } catch (error) {
      console.error("[admin action] unexpected error:", error);
      return fail("Coś poszło nie tak. Spróbuj ponownie.");
    }
  };
}

/** Public pages are static; refresh them after content changes. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}

type DeletableTable = "people" | "relationships" | "events" | "lore" | "locations";

/**
 * Deletes rows by id and reports failure when nothing was removed. PostgREST
 * returns no error when RLS filters every row out, so without `.select()` a
 * blocked delete would look like a success.
 */
export async function deleteByIds(db: AdminDb, table: DeletableTable, ids: string[]) {
  const { data, error } = await db.from(table).delete().in("id", ids).select("id");
  if (error) return fail(friendlyDbError(error, "Nie udało się usunąć."));
  if (!data?.length) return fail("Nic nie zostało usunięte. Brak uprawnień albo wpis już nie istnieje — odśwież stronę.");
  return null;
}
