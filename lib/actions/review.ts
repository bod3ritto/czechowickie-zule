"use server";

import { z } from "zod";
import { adminAction, revalidatePublic } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";

/**
 * Review of public submissions. Approving = publishing the submitted drafts;
 * rejecting = deleting them (see deletePeople / deleteRelationships).
 */

const reviewSchema = z
  .object({
    people: z.array(z.guid()).max(500).default([]),
    relationships: z.array(z.guid()).max(500).default([]),
  })
  .refine((v) => v.people.length + v.relationships.length > 0, { message: "Nic nie zaznaczono.", path: ["people"] });

const approveAction = adminAction(reviewSchema, async ({ people, relationships }, { db }) => {
  // People first: a relationship is only visible once both ends are published.
  if (people.length) {
    const { data, error } = await db.from("people").update({ status: "published" }).in("id", people).select("id");
    if (error) return fail(friendlyDbError(error, "Nie udało się zatwierdzić."));
    if (!data?.length) return fail("Nic nie zostało zatwierdzone. Odśwież stronę.");
  }
  if (relationships.length) {
    const { data, error } = await db.from("relationships").update({ status: "published" }).in("id", relationships).select("id");
    if (error) return fail(friendlyDbError(error, "Nie udało się zatwierdzić relacji."));
    if (!data?.length) return fail("Nic nie zostało zatwierdzone. Odśwież stronę.");
  }
  revalidatePublic();
  return ok(undefined, "Zatwierdzono i opublikowano.");
});

export async function approveSubmissions(input: z.input<typeof reviewSchema>) {
  return approveAction(input);
}
