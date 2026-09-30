"use server";

import { z } from "zod";
import { adminAction, deleteByIds, revalidatePublic } from "./admin-action";
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

// -------------------------------------------------------- change requests ----
const closeSchema = z.object({ id: z.guid(), status: z.enum(["open", "resolved", "rejected"]) });

const closeAction = adminAction(closeSchema, async ({ id, status }, { db }) => {
  const { data, error } = await db.from("change_requests").update({ status }).eq("id", id).select("id");
  if (error) return fail(friendlyDbError(error));
  if (!data?.length) return fail("Nie znaleziono prośby. Odśwież stronę.");
  return ok(undefined, status === "resolved" ? "Oznaczono jako załatwione." : status === "rejected" ? "Odrzucono prośbę." : "Przywrócono prośbę.");
});

export async function closeChangeRequest(input: z.input<typeof closeSchema>) {
  return closeAction(input);
}

/** Removal request: delete the person (their relationships go with them) and close the request. */
const removeAction = adminAction(z.object({ id: z.guid() }), async ({ id }, { db }) => {
  const { data: request, error } = await db.from("change_requests").select("person_id").eq("id", id).maybeSingle();
  if (error) return fail(friendlyDbError(error));
  if (!request) return fail("Nie znaleziono prośby. Odśwież stronę.");
  if (request.person_id) {
    const failed = await deleteByIds(db, "people", [request.person_id]);
    if (failed) return failed;
  }
  const { error: closeError } = await db.from("change_requests").update({ status: "resolved" }).eq("id", id);
  if (closeError) return fail("Osobę usunięto, ale nie udało się zamknąć prośby.");
  revalidatePublic();
  return ok(undefined, "Usunięto osobę z mapy i zamknięto prośbę.");
});

export async function removePersonForRequest(input: { id: string }) {
  return removeAction(input);
}
