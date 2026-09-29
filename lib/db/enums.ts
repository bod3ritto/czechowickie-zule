/**
 * Enum values mirrored from the SQL migration. Keep in sync with
 * supabase/migrations/*_schema.sql (a test checks this).
 */
export const STATUS_VALUES = ["draft", "published", "archived"] as const;
export const CONFIDENCE_VALUES = ["confirmed", "probable", "lore", "rumor"] as const;
export const SOURCE_TYPE_VALUES = ["personal", "submitted", "public", "unknown"] as const;
export const PERSON_CATEGORY_VALUES = [
  "stala-ekipa",
  "bywalec",
  "legenda",
  "z-daleka",
  "swiezak",
  "osiedlowy",
  "imprezowicz",
  "kibic",
  "sportowiec",
  "dzialkowicz",
  "zlota-raczka",
  "biznesmen",
  "emigrant",
  "tajemniczy",
] as const;
export const RELATIONSHIP_TYPE_VALUES = [
  "znajomi",
  "rodzina",
  "szkola",
  "praca",
  "osiedle",
  "sasiedztwo",
  "imprezy",
  "sport",
  "akcje",
  "biznes",
  "z-widzenia",
  "podobno",
  "duet",
  "triumwirat",
  "zwiazek",
  "inne",
] as const;
export const RELATIONSHIP_TONE_VALUES = ["pozytywna", "neutralna", "zabawna", "skomplikowana"] as const;
export const LORE_TYPE_VALUES = ["historia", "ciekawostka", "cytat", "legenda", "inside-joke", "plotka"] as const;
export const MEDIA_KIND_VALUES = ["avatar", "event", "lore", "other"] as const;

export type Status = (typeof STATUS_VALUES)[number];
export type SourceType = (typeof SOURCE_TYPE_VALUES)[number];
export type MediaKind = (typeof MEDIA_KIND_VALUES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Wersja robocza",
  published: "Opublikowane",
  archived: "Zarchiwizowane",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  personal: "Osobiste",
  submitted: "Zgłoszone",
  public: "Publiczne",
  unknown: "Nieznane",
};
