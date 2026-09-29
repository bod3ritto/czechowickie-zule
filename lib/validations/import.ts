import { z } from "zod";
import {
  CONFIDENCE_VALUES,
  LORE_TYPE_VALUES,
  MEDIA_KIND_VALUES,
  PERSON_CATEGORY_VALUES,
  RELATIONSHIP_TYPE_VALUES,
  STATUS_VALUES,
} from "@/lib/db/enums";
import { SLUG_RE } from "./common";
import { pairKey } from "@/lib/admin/network";

/**
 * Schema of the JSON produced by "Eksportuj dane". Rows are validated for the
 * fields that matter for integrity; unknown extra columns are kept as-is.
 */
const ts = z.string().optional();
const status = z.enum(STATUS_VALUES).default("draft");

const row = <T extends z.ZodRawShape>(shape: T) => z.looseObject(shape);

export const importSchema = z.object({
  version: z.literal(1, "Nieobsługiwana wersja pliku (oczekiwano 1)."),
  exported_at: ts,
  locations: z.array(row({ id: z.guid(), name: z.string().min(1) })).default([]),
  people: z
    .array(
      row({
        id: z.guid(),
        slug: z.string().regex(SLUG_RE, "Nieprawidłowy slug osoby."),
        first_name: z.string().min(1),
        category: z.enum(PERSON_CATEGORY_VALUES).default("bywalec"),
        aliases: z.array(z.string()).default([]),
        tags: z.array(z.string()).default([]),
        bio: z.string().default(""),
        status,
      }),
    )
    .default([]),
  relationships: z
    .array(
      row({
        id: z.guid(),
        slug: z.string().regex(SLUG_RE),
        person_a: z.guid(),
        person_b: z.guid(),
        type: z.enum(RELATIONSHIP_TYPE_VALUES),
        strength: z.number().int().min(0).max(100).default(50),
        description: z.string().default(""),
        confidence: z.enum(CONFIDENCE_VALUES).default("confirmed"),
        status,
      }).refine((r) => r.person_a !== r.person_b, "Relacja łączy osobę samą ze sobą."),
    )
    .default([]),
  events: z.array(row({ id: z.guid(), title: z.string().min(1), status })).default([]),
  event_people: z.array(row({ event_id: z.guid(), person_id: z.guid() })).default([]),
  event_relationships: z.array(row({ event_id: z.guid(), relationship_id: z.guid() })).default([]),
  lore: z
    .array(row({ id: z.guid(), content: z.string().min(1), lore_type: z.enum(LORE_TYPE_VALUES).default("ciekawostka"), status }))
    .default([]),
  lore_people: z.array(row({ lore_id: z.guid(), person_id: z.guid() })).default([]),
  media: z.array(row({ id: z.guid(), storage_path: z.string().min(1), kind: z.enum(MEDIA_KIND_VALUES) })).default([]),
});

export type ImportPayload = z.output<typeof importSchema>;

export interface ImportPreview {
  counts: { people: number; relationships: number; events: number; lore: number; locations: number };
  warnings: string[];
}

/**
 * Pre-flight checks shown before importing: duplicates inside the file, clashes
 * with existing data and dangling references. Nothing here blocks the import;
 * the database constraints are the final guard.
 */
export function analyzeImport(
  payload: ImportPayload,
  existing: { people: { id: string; slug: string }[]; relationships: { personA: string; personB: string }[] },
): ImportPreview {
  const warnings: string[] = [];
  const peopleIds = new Set(payload.people.map((p) => p.id));
  const existingIds = new Set(existing.people.map((p) => p.id));
  const existingSlugs = new Map(existing.people.map((p) => [p.slug, p.id]));

  const seenSlugs = new Set<string>();
  for (const p of payload.people) {
    if (seenSlugs.has(p.slug)) warnings.push(`Slug „${p.slug}” występuje w pliku więcej niż raz.`);
    seenSlugs.add(p.slug);
    const owner = existingSlugs.get(p.slug);
    if (owner && owner !== p.id) warnings.push(`Osoba o slugu „${p.slug}” już istnieje w bazie — zostanie pominięta (tryb scalania).`);
  }

  const seenPairs = new Set<string>();
  const existingPairs = new Set(existing.relationships.map((r) => pairKey(r.personA, r.personB)));
  for (const r of payload.relationships) {
    const key = pairKey(r.person_a, r.person_b);
    if (seenPairs.has(key)) warnings.push(`Relacja ${r.slug} dubluje inną relację z pliku.`);
    else if (existingPairs.has(key)) warnings.push(`Relacja ${r.slug} już istnieje w bazie (A–B) — zostanie pominięta.`);
    seenPairs.add(key);
    for (const end of [r.person_a, r.person_b]) {
      if (!peopleIds.has(end) && !existingIds.has(end)) warnings.push(`Relacja ${r.slug} wskazuje na nieistniejącą osobę.`);
    }
  }

  const eventIds = new Set(payload.events.map((e) => e.id));
  const dangling = payload.event_people.filter((l) => !eventIds.has(l.event_id) || (!peopleIds.has(l.person_id) && !existingIds.has(l.person_id)));
  if (dangling.length) warnings.push(`${dangling.length} powiązań wydarzeń wskazuje na brakujące elementy — zostaną pominięte.`);

  return {
    counts: {
      people: payload.people.length,
      relationships: payload.relationships.length,
      events: payload.events.length,
      lore: payload.lore.length,
      locations: payload.locations.length,
    },
    warnings: [...new Set(warnings)].slice(0, 50),
  };
}
