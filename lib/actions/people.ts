"use server";

import { z } from "zod";
import { adminAction, revalidatePublic } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";
import { idsSchema } from "@/lib/validations/common";
import { personSchema, statusChangeSchema, type PersonInput } from "@/lib/validations/entities";
import { uniqueSlug } from "@/lib/admin/network";
import { PERSON_CATEGORY_VALUES } from "@/lib/db/enums";
import { STATUS_MESSAGE } from "./status-messages";

const savePersonAction = adminAction(personSchema, async (v, { db }) => {
  const row = {
    slug: v.slug,
    first_name: v.firstName,
    last_name: v.lastName,
    nickname: v.nickname,
    aliases: v.aliases,
    bio: v.bio,
    legend: v.legend,
    category: v.category,
    tags: v.tags,
    birth_date: v.birthDate,
    first_seen: v.firstSeen,
    location_id: v.locationId,
    admin_notes: v.adminNotes,
    status: v.status,
  };

  if (v.id) {
    const { error } = await db.from("people").update(row).eq("id", v.id);
    if (error) return fail(friendlyDbError(error), error.code === "23505" ? { slug: friendlyDbError(error) } : undefined);
    revalidatePublic();
    return ok({ id: v.id, slug: v.slug }, v.status === "published" ? "Zapisano i opublikowano." : "Zmiany zapisane.");
  }

  const { data, error } = await db.from("people").insert(row).select("id").single();
  if (error || !data) {
    return fail(friendlyDbError(error ?? {}), error?.code === "23505" ? { slug: friendlyDbError(error) } : undefined);
  }

  if (v.newLore?.length) {
    const { data: loreRows, error: loreError } = await db
      .from("lore")
      .insert(
        v.newLore.map((l) => ({
          content: l.content,
          lore_type: "ciekawostka" as const,
          confidence: l.confidence,
          year: l.year,
          source_type: "personal" as const,
          source_note: l.sourceNote,
          status: v.status,
        })),
      )
      .select("id");
    if (loreError || !loreRows) return ok({ id: data.id, slug: v.slug }, "Osoba utworzona, ale nie udało się zapisać ciekawostek.");
    await db.from("lore_people").insert(loreRows.map((l) => ({ lore_id: l.id, person_id: data.id })));
  }

  revalidatePublic();
  return ok({ id: data.id, slug: v.slug }, "Osoba została utworzona.");
});

export async function savePerson(input: PersonInput) {
  return savePersonAction(input);
}

const setStatusAction = adminAction(statusChangeSchema, async ({ ids, status }, { db }) => {
  const { error } = await db.from("people").update({ status }).in("id", ids);
  if (error) return fail(friendlyDbError(error));
  revalidatePublic();
  return ok(undefined, STATUS_MESSAGE[status]);
});

export async function setPeopleStatus(input: z.input<typeof statusChangeSchema>) {
  return setStatusAction(input);
}

const deleteAction = adminAction(idsSchema, async ({ ids }, { db }) => {
  const { error } = await db.from("people").delete().in("id", ids);
  if (error) return fail(friendlyDbError(error, "Nie udało się usunąć."));
  revalidatePublic();
  return ok(undefined, ids.length > 1 ? `Usunięto ${ids.length} osoby.` : "Usunięto osobę.");
});

export async function deletePeople(input: z.input<typeof idsSchema>) {
  return deleteAction(input);
}

const duplicateAction = adminAction(z.object({ id: z.uuid() }), async ({ id }, { db }) => {
  const { data: source, error } = await db.from("people").select("*").eq("id", id).single();
  if (error || !source) return fail("Nie znaleziono osoby.");
  const { data: taken } = await db.from("people").select("slug").like("slug", `${source.slug}%`);
  const slug = uniqueSlug(`${source.slug}-kopia`, (taken ?? []).map((t) => t.slug));
  const { id: _id, created_at: _c, updated_at: _u, published_at: _p, archived_at: _a, ...rest } = source; // eslint-disable-line @typescript-eslint/no-unused-vars
  const { data, error: insertError } = await db
    .from("people")
    .insert({ ...rest, slug, first_name: `${source.first_name} (kopia)`, status: "draft" })
    .select("id")
    .single();
  if (insertError || !data) return fail(friendlyDbError(insertError ?? {}));
  return ok({ id: data.id }, "Utworzono kopię jako wersję roboczą.");
});

export async function duplicatePerson(input: { id: string }) {
  return duplicateAction(input);
}

const categoryAction = adminAction(
  z.object({ ids: z.array(z.uuid()).min(1).max(500), category: z.enum(PERSON_CATEGORY_VALUES) }),
  async ({ ids, category }, { db }) => {
    const { error } = await db.from("people").update({ category }).in("id", ids);
    if (error) return fail(friendlyDbError(error));
    revalidatePublic();
    return ok(undefined, "Zmieniono kategorię.");
  },
);

export async function setPeopleCategory(input: { ids: string[]; category: (typeof PERSON_CATEGORY_VALUES)[number] }) {
  return categoryAction(input);
}
