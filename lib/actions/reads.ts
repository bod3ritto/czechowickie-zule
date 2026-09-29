"use server";

import { z } from "zod";
import { adminAction } from "./admin-action";
import { fail, ok } from "./result";
import type { PersonRow, RelationshipRow } from "@/lib/db/database.types";

/** Full rows for inline editing inside the admin graph (admin-only reads). */
const personAction = adminAction(z.object({ id: z.guid() }), async ({ id }, { db }) => {
  const { data, error } = await db.from("people").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fail("Nie znaleziono osoby.");
  return ok(data as PersonRow);
});

export async function getPersonRow(input: { id: string }) {
  return personAction(input);
}

const relationshipAction = adminAction(z.object({ id: z.guid() }), async ({ id }, { db }) => {
  const { data, error } = await db.from("relationships").select("*").eq("id", id).maybeSingle();
  if (error || !data) return fail("Nie znaleziono relacji.");
  return ok(data as RelationshipRow);
});

export async function getRelationshipRow(input: { id: string }) {
  return relationshipAction(input);
}
