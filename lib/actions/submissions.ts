"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";
import {
  personSubmissionSchema,
  relationshipSubmissionSchema,
  submissionErrorMessage,
  type PersonSubmissionInput,
  type RelationshipSubmissionInput,
} from "@/lib/validations/submissions";
import { fail, ok, zodFieldErrors, type ActionResult } from "./result";

/**
 * Public, unauthenticated submissions. They run with the anon key (no
 * session), so the database decides what is allowed: the only write anon can
 * do is these two SECURITY DEFINER functions, which create DRAFT rows that an
 * admin has to approve.
 */

const THANKS = "Dzięki! Zgłoszenie czeka na zatwierdzenie przez administratora.";
const UNAVAILABLE = "Dodawanie jest chwilowo niedostępne.";

export async function submitPerson(input: PersonSubmissionInput): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail(UNAVAILABLE);
  const parsed = personSubmissionSchema.safeParse(input);
  if (!parsed.success) return fail("Popraw zaznaczone pola.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  if (v.website) return ok(undefined, THANKS); // honeypot: pretend it worked

  const { error } = await createPublicClient().rpc("submit_person", {
    first_name: v.firstName,
    nickname: v.nickname,
    bio: v.bio,
    category: v.category,
    related_to: v.relatedTo,
    related_type: v.relatedTo ? (v.relatedType ?? null) : null,
    related_description: v.relatedTo ? v.relatedDescription : null,
    submitted_by: v.submittedBy,
  });
  if (error) {
    console.error("[submission] person:", error.message);
    return fail(submissionErrorMessage(error.message));
  }
  return ok(undefined, THANKS);
}

export async function submitRelationship(input: RelationshipSubmissionInput): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail(UNAVAILABLE);
  const parsed = relationshipSubmissionSchema.safeParse(input);
  if (!parsed.success) return fail("Popraw zaznaczone pola.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  if (v.website) return ok(undefined, THANKS);

  const { error } = await createPublicClient().rpc("submit_relationship", {
    person_a: v.personA,
    person_b: v.personB,
    type: v.type,
    description: v.description,
    since_year: v.sinceYear,
    submitted_by: v.submittedBy,
  });
  if (error) {
    console.error("[submission] relationship:", error.message);
    return fail(submissionErrorMessage(error.message));
  }
  return ok(undefined, THANKS);
}
