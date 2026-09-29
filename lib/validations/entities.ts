import { z } from "zod";
import {
  CONFIDENCE_VALUES,
  LORE_TYPE_VALUES,
  PERSON_CATEGORY_VALUES,
  RELATIONSHIP_TONE_VALUES,
  RELATIONSHIP_TYPE_VALUES,
  SOURCE_TYPE_VALUES,
  STATUS_VALUES,
} from "@/lib/db/enums";
import {
  SLUG_RE,
  idList,
  optCoordinate,
  optDate,
  optMonth,
  optText,
  optUuid,
  optYear,
  stringList,
} from "./common";

const status = z.enum(STATUS_VALUES);
const confidence = z.enum(CONFIDENCE_VALUES);
const sourceType = z.enum(SOURCE_TYPE_VALUES);

// ------------------------------------------------------------------ lore ----
/** Quick fun fact added straight from the person form. */
export const inlineLoreSchema = z.object({
  content: z.string().trim().min(1, "Treść jest wymagana.").max(1000),
  sourceNote: optText(500),
  confidence,
  year: optYear,
});

export const loreSchema = z.object({
  id: z.uuid().optional(),
  title: optText(160),
  content: z.string().trim().min(1, "Treść jest wymagana.").max(4000, "Maksymalnie 4000 znaków."),
  loreType: z.enum(LORE_TYPE_VALUES),
  year: optYear,
  confidence,
  sourceType,
  sourceNote: optText(1000),
  people: idList(),
  status,
});

// ---------------------------------------------------------------- people ----
export const personSchema = z.object({
  id: z.uuid().optional(),
  firstName: z.string().trim().min(1, "Imię jest wymagane.").max(80, "Maksymalnie 80 znaków."),
  lastName: optText(80),
  nickname: optText(80),
  slug: z
    .string()
    .trim()
    .min(1, "Slug jest wymagany.")
    .max(80, "Maksymalnie 80 znaków.")
    .regex(SLUG_RE, "Tylko małe litery bez polskich znaków, cyfry i myślniki, np. marek-kowalski."),
  bio: z.string().trim().max(2000, "Maksymalnie 2000 znaków."),
  legend: optText(500),
  category: z.enum(PERSON_CATEGORY_VALUES),
  status,
  tags: stringList(30, 40),
  aliases: stringList(20, 60),
  birthDate: optDate,
  firstSeen: optYear,
  locationId: optUuid,
  adminNotes: optText(4000),
  /** Only used when creating: fun facts saved as lore entries. */
  newLore: z.array(inlineLoreSchema).max(30).optional(),
});

// --------------------------------------------------------- relationships ----
export const relationshipSchema = z
  .object({
    id: z.uuid().optional(),
    personA: z.uuid("Wybierz osobę A."),
    personB: z.uuid("Wybierz osobę B."),
    type: z.enum(RELATIONSHIP_TYPE_VALUES, "Wybierz typ relacji."),
    strength: z.number().int().min(0).max(100),
    sinceYear: optYear,
    sinceDate: optDate,
    untilYear: optYear,
    untilDate: optDate,
    description: z.string().trim().max(2000, "Maksymalnie 2000 znaków."),
    tone: z.enum(RELATIONSHIP_TONE_VALUES).nullable().optional().transform((v) => v ?? null),
    confidence,
    sourceType,
    sourceNote: optText(1000),
    locationId: optUuid,
    status,
  })
  .refine((v) => v.personA !== v.personB, {
    message: "Osoba nie może być w relacji sama ze sobą.",
    path: ["personB"],
  })
  .refine(
    (v) => {
      const since = v.sinceYear ?? (v.sinceDate ? Number(v.sinceDate.slice(0, 4)) : null);
      const until = v.untilYear ?? (v.untilDate ? Number(v.untilDate.slice(0, 4)) : null);
      return since === null || until === null || until >= since;
    },
    { message: "Koniec nie może być wcześniej niż początek.", path: ["untilYear"] },
  );

// ---------------------------------------------------------------- events ----
export const eventSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Tytuł jest wymagany.").max(200, "Maksymalnie 200 znaków."),
  description: optText(4000),
  eventDate: optDate,
  year: optYear,
  month: optMonth,
  people: idList(),
  relationships: idList(),
  locationId: optUuid,
  confidence,
  sourceType,
  sourceNote: optText(1000),
  status,
});

/** Inline date change from the person's event timeline. */
export const eventDateSchema = z.object({
  id: z.uuid(),
  year: optYear,
  eventDate: optDate,
});

// ------------------------------------------------------------- locations ----
export const locationSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Nazwa jest wymagana.").max(120),
    description: optText(1000),
    address: optText(300),
    lat: optCoordinate(-90, 90),
    lng: optCoordinate(-180, 180),
  })
  .refine((v) => (v.lat === null) === (v.lng === null), {
    message: "Podaj obie współrzędne albo żadnej.",
    path: ["lng"],
  });

// ------------------------------------------------------------------ bulk ----
export const statusChangeSchema = z.object({
  ids: z.array(z.uuid()).min(1, "Nic nie zaznaczono.").max(500),
  status,
});

export type PersonInput = z.input<typeof personSchema>;
export type PersonValues = z.output<typeof personSchema>;
export type RelationshipInput = z.input<typeof relationshipSchema>;
export type RelationshipValues = z.output<typeof relationshipSchema>;
export type EventInput = z.input<typeof eventSchema>;
export type EventValues = z.output<typeof eventSchema>;
export type LoreInput = z.input<typeof loreSchema>;
export type LoreValues = z.output<typeof loreSchema>;
export type LocationInput = z.input<typeof locationSchema>;
