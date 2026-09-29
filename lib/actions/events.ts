"use server";

import type { z } from "zod";
import { adminAction, revalidatePublic, type AdminDb } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";
import { STATUS_MESSAGE } from "./status-messages";
import { idsSchema, yearFrom } from "@/lib/validations/common";
import { eventDateSchema, eventSchema, statusChangeSchema, type EventInput } from "@/lib/validations/entities";

/** Replaces the participant / relationship links of an event. */
async function syncLinks(db: AdminDb, eventId: string, people: string[], relationships: string[]) {
  const [dp, dr] = await Promise.all([
    db.from("event_people").delete().eq("event_id", eventId),
    db.from("event_relationships").delete().eq("event_id", eventId),
  ]);
  if (dp.error || dr.error) return dp.error ?? dr.error;
  if (people.length) {
    const { error } = await db.from("event_people").insert(people.map((person_id) => ({ event_id: eventId, person_id })));
    if (error) return error;
  }
  if (relationships.length) {
    const { error } = await db
      .from("event_relationships")
      .insert(relationships.map((relationship_id) => ({ event_id: eventId, relationship_id })));
    if (error) return error;
  }
  return null;
}

const saveAction = adminAction(eventSchema, async (v, { db }) => {
  const row = {
    title: v.title,
    description: v.description,
    event_date: v.eventDate,
    year: yearFrom(v.year, v.eventDate),
    month: v.month ?? (v.eventDate ? Number(v.eventDate.slice(5, 7)) : null),
    location_id: v.locationId,
    confidence: v.confidence,
    source_type: v.sourceType,
    source_note: v.sourceNote,
    status: v.status,
  };

  let id = v.id;
  if (id) {
    const { error } = await db.from("events").update(row).eq("id", id);
    if (error) return fail(friendlyDbError(error));
  } else {
    const { data, error } = await db.from("events").insert(row).select("id").single();
    if (error || !data) return fail(friendlyDbError(error ?? {}));
    id = data.id;
  }

  const linkError = await syncLinks(db, id, v.people, v.relationships);
  if (linkError) return fail("Wydarzenie zapisane, ale nie udało się zapisać uczestników.");
  revalidatePublic();
  return ok({ id }, v.id ? "Wydarzenie zostało zapisane." : "Wydarzenie zostało utworzone.");
});

export async function saveEvent(input: EventInput) {
  return saveAction(input);
}

const dateAction = adminAction(eventDateSchema, async ({ id, year, eventDate }, { db }) => {
  const { error } = await db
    .from("events")
    .update({
      year: yearFrom(year, eventDate),
      event_date: eventDate,
      month: eventDate ? Number(eventDate.slice(5, 7)) : null,
    })
    .eq("id", id);
  if (error) return fail(friendlyDbError(error));
  revalidatePublic();
  return ok(undefined, "Data wydarzenia zmieniona.");
});

export async function updateEventDate(input: z.input<typeof eventDateSchema>) {
  return dateAction(input);
}

const statusAction = adminAction(statusChangeSchema, async ({ ids, status }, { db }) => {
  const { error } = await db.from("events").update({ status }).in("id", ids);
  if (error) return fail(friendlyDbError(error));
  revalidatePublic();
  return ok(undefined, STATUS_MESSAGE[status]);
});

export async function setEventsStatus(input: z.input<typeof statusChangeSchema>) {
  return statusAction(input);
}

const deleteAction = adminAction(idsSchema, async ({ ids }, { db }) => {
  const { error } = await db.from("events").delete().in("id", ids);
  if (error) return fail(friendlyDbError(error, "Nie udało się usunąć."));
  revalidatePublic();
  return ok(undefined, ids.length > 1 ? `Usunięto ${ids.length} wydarzenia.` : "Usunięto wydarzenie.");
});

export async function deleteEvents(input: z.input<typeof idsSchema>) {
  return deleteAction(input);
}
