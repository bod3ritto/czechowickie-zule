"use server";

import { z } from "zod";
import { adminAction, adminOnlyAction, deleteByIds, revalidatePublic } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";
import { STATUS_MESSAGE } from "./status-messages";
import { idsSchema } from "@/lib/validations/common";
import { relationshipSchema, statusChangeSchema, type RelationshipInput } from "@/lib/validations/entities";
import { RELATIONSHIP_TYPE_VALUES } from "@/lib/db/enums";
import { uniqueSlug } from "@/lib/admin/network";

const saveAction = adminAction(relationshipSchema, async (v, { db }) => {
  // Undirected uniqueness: A–B is the same as B–A. The DB index enforces it
  // too; checking first gives a precise message and the existing id.
  const { data: existing } = await db
    .from("relationships")
    .select("id")
    .or(`and(person_a.eq.${v.personA},person_b.eq.${v.personB}),and(person_a.eq.${v.personB},person_b.eq.${v.personA})`)
    .limit(1);
  const duplicate = existing?.find((r) => r.id !== v.id);
  if (duplicate) {
    return fail("Ta relacja już istnieje.", { personB: `Ta relacja już istnieje (id: ${duplicate.id}).` });
  }

  const row = {
    person_a: v.personA,
    person_b: v.personB,
    type: v.type,
    strength: v.strength,
    since_year: v.sinceYear,
    since_date: v.sinceDate,
    until_year: v.untilYear,
    until_date: v.untilDate,
    description: v.description,
    tone: v.tone,
    confidence: v.confidence,
    source_type: v.sourceType,
    source_note: v.sourceNote,
    location_id: v.locationId,
    status: v.status,
  };

  if (v.id) {
    const { error } = await db.from("relationships").update(row).eq("id", v.id);
    if (error) return fail(friendlyDbError(error));
    revalidatePublic();
    return ok({ id: v.id }, "Relacja została zapisana.");
  }

  const { data: ends } = await db.from("people").select("id, slug").in("id", [v.personA, v.personB]);
  const slugOf = (id: string) => ends?.find((p) => p.id === id)?.slug ?? "osoba";
  const base = `${slugOf(v.personA)}-${slugOf(v.personB)}`;
  const { data: taken } = await db.from("relationships").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, (taken ?? []).map((t) => t.slug));

  const { data, error } = await db.from("relationships").insert({ ...row, slug }).select("id").single();
  if (error || !data) return fail(friendlyDbError(error ?? {}));
  revalidatePublic();
  return ok({ id: data.id }, "Relacja została utworzona.");
});

export async function saveRelationship(input: RelationshipInput) {
  return saveAction(input);
}

const statusAction = adminAction(statusChangeSchema, async ({ ids, status }, { db }) => {
  const { error } = await db.from("relationships").update({ status }).in("id", ids);
  if (error) return fail(friendlyDbError(error));
  revalidatePublic();
  return ok(undefined, STATUS_MESSAGE[status]);
});

export async function setRelationshipsStatus(input: z.input<typeof statusChangeSchema>) {
  return statusAction(input);
}

const typeAction = adminAction(
  z.object({ ids: z.array(z.guid()).min(1).max(500), type: z.enum(RELATIONSHIP_TYPE_VALUES) }),
  async ({ ids, type }, { db }) => {
    const { error } = await db.from("relationships").update({ type }).in("id", ids);
    if (error) return fail(friendlyDbError(error));
    revalidatePublic();
    return ok(undefined, "Zmieniono typ relacji.");
  },
);

export async function setRelationshipsType(input: { ids: string[]; type: string }) {
  return typeAction(input as { ids: string[]; type: (typeof RELATIONSHIP_TYPE_VALUES)[number] });
}

const deleteAction = adminOnlyAction(idsSchema, async ({ ids }, { db }) => {
  const failed = await deleteByIds(db, "relationships", ids);
  if (failed) return failed;
  revalidatePublic();
  return ok(undefined, ids.length > 1 ? `Usunięto ${ids.length} relacje.` : "Usunięto relację.");
});

export async function deleteRelationships(input: z.input<typeof idsSchema>) {
  return deleteAction(input);
}
