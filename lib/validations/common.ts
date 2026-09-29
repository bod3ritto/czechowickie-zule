import { z } from "zod";

/**
 * Form-friendly field helpers: forms work with strings (empty = not set),
 * the schema outputs proper DB values (null, numbers).
 */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksymalnie ${max} znaków.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const optYear = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= 2100), "Podaj rok w formacie RRRR (1900–2100).")
  .transform((v) => (v ? Number(v) : null));

export const optMonth = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || (/^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 12), "Miesiąc 1–12.")
  .transform((v) => (v ? Number(v) : null));

export const optDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Nieprawidłowa data.")
  .transform((v) => (v ? v : null));

export const optUuid = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || z.guid().safeParse(v).success, "Nieprawidłowy identyfikator.")
  .transform((v) => (v ? v : null));

export const optCoordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((v) => !v || (!Number.isNaN(Number(v.replace(",", "."))) && Math.abs(Number(v.replace(",", "."))) <= max && Number(v.replace(",", ".")) >= min), `Wartość od ${min} do ${max}.`)
    .transform((v) => (v ? Number(v.replace(",", ".")) : null));

export const idList = (max = 200) => z.array(z.guid()).max(max);

export const stringList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength, `Maksymalnie ${maxLength} znaków.`))
    .max(maxItems)
    .transform((list) => [...new Set(list)]);

export const idsSchema = z.object({ ids: z.array(z.guid()).min(1, "Nic nie zaznaczono.").max(500) });

/** Year taken from an explicit year or, failing that, from a date. */
export function yearFrom(year: number | null, date: string | null): number | null {
  if (year) return year;
  return date ? Number(date.slice(0, 4)) : null;
}
