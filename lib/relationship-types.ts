import type { Confidence, LoreType, PersonCategory, Relationship, RelationshipTone, RelationshipType } from "@/types/domain";

export interface RelationshipTypeMeta {
  label: string;
  /** Hex color; used both by Canvas and CSS. */
  color: string;
  /** Canvas line dash in graph units; empty = solid. */
  dash: number[];
  filter: FilterKey;
}

export const RELATIONSHIP_TYPES: Record<RelationshipType, RelationshipTypeMeta> = {
  znajomi: { label: "Znajomi", color: "#7dd3fc", dash: [], filter: "znajomi" },
  duet: { label: "Legendarny duet", color: "#e9d5ff", dash: [], filter: "znajomi" },
  rodzina: { label: "Rodzina", color: "#f0abfc", dash: [], filter: "rodzina" },
  szkola: { label: "Szkoła", color: "#fcd34d", dash: [], filter: "szkola" },
  praca: { label: "Praca", color: "#a5b4fc", dash: [4, 2], filter: "praca" },
  biznes: { label: "Biznes", color: "#93c5fd", dash: [4, 2], filter: "praca" },
  osiedle: { label: "Osiedle", color: "#86efac", dash: [], filter: "osiedle" },
  sasiedztwo: { label: "Sąsiedztwo", color: "#bef264", dash: [], filter: "osiedle" },
  imprezy: { label: "Imprezy", color: "#fb923c", dash: [], filter: "imprezy" },
  akcje: { label: "Wspólne akcje", color: "#f87171", dash: [], filter: "imprezy" },
  sport: { label: "Sport", color: "#5eead4", dash: [], filter: "sport" },
  "z-widzenia": { label: "Znają się z widzenia", color: "#a1a1aa", dash: [1.5, 2.5], filter: "inne" },
  podobno: { label: "Podobno", color: "#a1a1aa", dash: [0.5, 3], filter: "inne" },
  inne: { label: "Inne", color: "#d4d4d8", dash: [], filter: "inne" },
};

export type FilterKey =
  | "all"
  | "znajomi"
  | "rodzina"
  | "szkola"
  | "praca"
  | "sport"
  | "osiedle"
  | "imprezy"
  | "inne";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "znajomi", label: "Znajomi" },
  { key: "rodzina", label: "Rodzina" },
  { key: "szkola", label: "Szkoła" },
  { key: "praca", label: "Praca" },
  { key: "sport", label: "Sport" },
  { key: "osiedle", label: "Osiedle" },
  { key: "imprezy", label: "Imprezy" },
  { key: "inne", label: "Inne" },
];

export function matchesFilter(rel: Relationship, filter: FilterKey): boolean {
  return filter === "all" || RELATIONSHIP_TYPES[rel.type].filter === filter;
}

/** Full labels (relationship details, admin). */
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: "Potwierdzone",
  probable: "Wiarygodne",
  lore: "Lokalne lore",
  rumor: "Niepotwierdzone — plotka",
};

/**
 * Short public badge. Confirmed information carries no badge; everything
 * else is labelled so unverified content is never presented as fact.
 */
export const CONFIDENCE_BADGE: Record<Confidence, string | null> = {
  confirmed: null,
  probable: "na podstawie relacji",
  lore: "lokalne lore",
  rumor: "niepotwierdzone",
};

export const LORE_TYPE_LABEL: Record<LoreType, string> = {
  historia: "Historia",
  ciekawostka: "Ciekawostka",
  cytat: "Cytat",
  legenda: "Legenda",
  "inside-joke": "Inside joke",
  plotka: "Plotka",
};

export const TONE_LABEL: Record<RelationshipTone, string> = {
  pozytywna: "Pozytywna",
  neutralna: "Neutralna",
  zabawna: "Zabawna",
  skomplikowana: "Skomplikowana",
};

export interface CategoryMeta {
  label: string;
  color: string;
}

export const PERSON_CATEGORIES: Record<PersonCategory, CategoryMeta> = {
  legenda: { label: "Legenda", color: "#fbbf24" },
  "stala-ekipa": { label: "Stała ekipa", color: "#e4e4e7" },
  bywalec: { label: "Bywalec", color: "#a78bfa" },
  "z-daleka": { label: "Z daleka", color: "#71717a" },
};

/** Unconfirmed relationships render as a dashed "mystery connection". */
export function isMystery(rel: Relationship): boolean {
  return rel.confidence === "rumor";
}
