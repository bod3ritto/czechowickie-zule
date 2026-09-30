"use server";

import type { z } from "zod";
import { adminAction, adminOnlyAction, deleteByIds, revalidatePublic } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";
import { idsSchema } from "@/lib/validations/common";
import { locationSchema, type LocationInput } from "@/lib/validations/entities";

const saveAction = adminAction(locationSchema, async (v, { db }) => {
  const row = { name: v.name, description: v.description, address: v.address, lat: v.lat, lng: v.lng };
  if (v.id) {
    const { error } = await db.from("locations").update(row).eq("id", v.id);
    if (error) return fail(friendlyDbError(error));
    revalidatePublic();
    return ok({ id: v.id }, "Lokalizacja zapisana.");
  }
  const { data, error } = await db.from("locations").insert(row).select("id").single();
  if (error || !data) return fail(friendlyDbError(error ?? {}));
  revalidatePublic();
  return ok({ id: data.id }, "Dodano lokalizację.");
});

export async function saveLocation(input: LocationInput) {
  return saveAction(input);
}

const deleteAction = adminOnlyAction(idsSchema, async ({ ids }, { db }) => {
  const failed = await deleteByIds(db, "locations", ids);
  if (failed) return failed;
  revalidatePublic();
  return ok(undefined, "Usunięto lokalizację.");
});

export async function deleteLocations(input: z.input<typeof idsSchema>) {
  return deleteAction(input);
}
