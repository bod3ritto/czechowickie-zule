import type { z } from "zod";

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: FieldErrors): { ok: false; error: string; fieldErrors?: FieldErrors } {
  return { ok: false, error, fieldErrors };
}

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
}

/**
 * Maps database errors to messages an admin can act on. Raw SQL / stack
 * traces are logged on the server and never sent to the browser.
 */
export function friendlyDbError(error: PostgrestLikeError, fallback = "Nie udało się zapisać zmian. Spróbuj ponownie."): string {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  switch (error.code) {
    case "23505":
      if (text.includes("people_slug_key")) return "Ten slug jest już zajęty przez inną osobę.";
      if (text.includes("relationships_pair_unique")) return "Ta relacja już istnieje.";
      if (text.includes("relationships_slug_key")) return "Relacja o takim adresie już istnieje.";
      return "Taki wpis już istnieje.";
    case "23514":
      if (text.includes("relationships_not_self")) return "Osoba nie może być w relacji sama ze sobą.";
      if (text.includes("slug")) return "Slug może zawierać tylko małe litery, cyfry i myślniki.";
      return "Niektóre wartości są poza dozwolonym zakresem.";
    case "23503":
      return "Powiązany element nie istnieje (mógł zostać usunięty).";
    case "42501":
    case "PGRST301":
      return "Brak uprawnień do tej operacji.";
    default:
      return fallback;
  }
}
