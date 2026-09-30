import { z } from "zod";
import { PERSON_CATEGORY_VALUES, RELATIONSHIP_TYPE_VALUES } from "@/lib/db/enums";
import { optText, optYear } from "./common";

/**
 * Public submission forms (no account). The database validates everything
 * again inside submit_person() / submit_relationship(); these schemas give
 * the visitor precise messages before a round trip.
 */

// Public people are addressed by slug, not by uuid.
const personRef = z.string().trim().min(1, "Wybierz osobę.").max(80);
// Bots fill every field; people never see this one. The action checks it
// after validation and pretends to succeed, so bots get no signal.
const honeypot = z.string().max(500).optional();

export const personSubmissionSchema = z
  .object({
    firstName: z.string().trim().min(1, "Imię jest wymagane.").max(80, "Maksymalnie 80 znaków."),
    nickname: optText(80),
    bio: optText(1000),
    category: z.enum(PERSON_CATEGORY_VALUES).default("bywalec"),
    relatedTo: optText(80),
    relatedType: z.enum(RELATIONSHIP_TYPE_VALUES).optional().nullable(),
    relatedDescription: optText(500),
    submittedBy: optText(80),
    website: honeypot,
  })
  .refine((v) => !v.relatedTo || v.relatedType, { message: "Wybierz, skąd się znają.", path: ["relatedType"] });

export const relationshipSubmissionSchema = z
  .object({
    personA: personRef,
    personB: personRef,
    type: z.enum(RELATIONSHIP_TYPE_VALUES, { message: "Wybierz typ relacji." }),
    description: optText(500),
    sinceYear: optYear.refine((y) => y === null || y <= new Date().getFullYear(), "Ten rok jeszcze nie nadszedł."),
    submittedBy: optText(80),
    website: honeypot,
  })
  .refine((v) => v.personA !== v.personB, { message: "Wybierz dwie różne osoby.", path: ["personB"] });

/** "Zgłoś zmianę": a correction to a person/relationship, or a removal request for a person. */
export const changeRequestSchema = z
  .object({
    kind: z.enum(["correction", "removal"]),
    person: optText(80),
    relationship: optText(160),
    message: optText(1000),
    contact: optText(200),
    submittedBy: optText(80),
    website: honeypot,
  })
  .refine((v) => Boolean(v.person) !== Boolean(v.relationship), { message: "Wybierz osobę.", path: ["person"] })
  .refine((v) => v.kind !== "removal" || Boolean(v.person), { message: "Wybierz osobę do usunięcia.", path: ["person"] })
  .refine((v) => v.kind !== "correction" || Boolean(v.message), { message: "Napisz, co trzeba poprawić.", path: ["message"] });

export type ChangeRequestInput = z.input<typeof changeRequestSchema>;
export type PersonSubmissionInput = z.input<typeof personSubmissionSchema>;
export type RelationshipSubmissionInput = z.input<typeof relationshipSubmissionSchema>;

/** Maps the error codes raised by the submission RPCs to messages for visitors. */
export function submissionErrorMessage(dbMessage: string | undefined): string {
  const m = dbMessage ?? "";
  if (m.includes("submission_rate_limit")) return "W ostatniej godzinie było bardzo dużo zgłoszeń. Spróbuj ponownie później.";
  if (m.includes("submission_queue_full")) return "Zbyt wiele zgłoszeń czeka na sprawdzenie. Spróbuj ponownie za jakiś czas.";
  if (m.includes("submission_relationship_exists")) return "Ta relacja jest już na mapie albo czeka na zatwierdzenie.";
  if (m.includes("submission_self_relationship")) return "Wybierz dwie różne osoby.";
  if (m.includes("submission_person_not_found")) return "Nie znaleziono wybranej osoby. Odśwież stronę i spróbuj ponownie.";
  if (m.includes("submission_invalid_year")) return "Podaj rok od 1900 do bieżącego.";
  if (m.includes("submission_too_long")) return "Któreś pole jest za długie.";
  if (m.includes("submission_missing")) return "Uzupełnij wymagane pola.";
  return "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.";
}
