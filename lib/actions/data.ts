"use server";

import { z } from "zod";
import { adminAction, revalidatePublic } from "./admin-action";
import { fail, ok } from "./result";
import { importSchema, type ImportPayload } from "@/lib/validations/import";
import type { Json } from "@/lib/db/database.types";

/**
 * Import runs as one Postgres function (`admin_import`), so it is atomic:
 * either everything is imported or nothing is. The payload is validated again
 * here — the preview in the browser is only a convenience.
 */
const importAction = adminAction(
  z.object({
    payload: importSchema,
    mode: z.enum(["merge", "replace"]),
    confirmation: z.string().optional(),
  }),
  async ({ payload, mode, confirmation }, { db }) => {
    if (mode === "replace" && confirmation !== "ZASTĄP") {
      return fail("Aby zastąpić wszystkie dane, wpisz ZASTĄP.");
    }
    const { data, error } = await db.rpc("admin_import", { payload: payload as unknown as Json, mode });
    if (error) {
      console.error("[import] failed:", error.message);
      return fail(
        error.code === "42501"
          ? "Brak uprawnień do importu."
          : "Import nie powiódł się. Żadne dane nie zostały zmienione. Sprawdź plik i spróbuj ponownie.",
      );
    }
    revalidatePublic();
    return ok(data as { people: number; relationships: number; events: number; lore: number }, "Import zakończony.");
  },
);

export async function importData(input: { payload: ImportPayload; mode: "merge" | "replace"; confirmation?: string }) {
  return importAction(input);
}
