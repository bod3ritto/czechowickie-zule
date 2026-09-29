"use server";

import type { z } from "zod";
import { adminAction, revalidatePublic } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";
import { STATUS_MESSAGE } from "./status-messages";
import { idsSchema } from "@/lib/validations/common";
import { loreSchema, statusChangeSchema, type LoreInput } from "@/lib/validations/entities";

const saveAction = adminAction(loreSchema, async (v, { db }) => {
  const row = {
    title: v.title,
    content: v.content,
    lore_type: v.loreType,
    year: v.year,
    confidence: v.confidence,
    source_type: v.sourceType,
    source_note: v.sourceNote,
    status: v.status,
  };

  let id = v.id;
  if (id) {
    const { error } = await db.from("lore").update(row).eq("id", id);
    if (error) return fail(friendlyDbError(error));
  } else {
    const { data, error } = await db.from("lore").insert(row).select("id").single();
    if (error || !data) return fail(friendlyDbError(error ?? {}));
    id = data.id;
  }

  const { error: delError } = await db.from("lore_people").delete().eq("lore_id", id);
  if (!delError && v.people.length) {
    await db.from("lore_people").insert(v.people.map((person_id) => ({ lore_id: id, person_id })));
  }
  revalidatePublic();
  return ok({ id }, v.id ? "Lore zostało zapisane." : "Dodano lore.");
});

export async function saveLore(input: LoreInput) {
  return saveAction(input);
}

const statusAction = adminAction(statusChangeSchema, async ({ ids, status }, { db }) => {
  const { error } = await db.from("lore").update({ status }).in("id", ids);
  if (error) return fail(friendlyDbError(error));
  revalidatePublic();
  return ok(undefined, STATUS_MESSAGE[status]);
});

export async function setLoreStatus(input: z.input<typeof statusChangeSchema>) {
  return statusAction(input);
}

const deleteAction = adminAction(idsSchema, async ({ ids }, { db }) => {
  const { error } = await db.from("lore").delete().in("id", ids);
  if (error) return fail(friendlyDbError(error, "Nie udało się usunąć."));
  revalidatePublic();
  return ok(undefined, ids.length > 1 ? `Usunięto ${ids.length} wpisy lore.` : "Usunięto lore.");
});

export async function deleteLore(input: z.input<typeof idsSchema>) {
  return deleteAction(input);
}
