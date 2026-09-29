/**
 * Public domain model: exactly what the public map needs. The admin panel
 * works on richer database rows (`lib/db/types.ts`); `lib/data` maps those
 * rows to these shapes and never exposes admin-only fields (sources, notes,
 * last names, birth dates, drafts outside preview).
 */

export type PersonId = string;
export type RelationshipId = string;
export type EventId = string;

/** Geographic point, prepared for the future "Ta historia wydarzyła się tutaj" map. */
export interface Place {
  name: string;
  lat: number;
  lng: number;
}

/** Visual grouping of people on the map. Purely descriptive, never a score. */
export type PersonCategory = "stala-ekipa" | "bywalec" | "legenda" | "z-daleka";

/** Publication status. The public site only ever shows `published`. */
export type ContentStatus = "draft" | "published" | "archived";

/**
 * How sure we are about a piece of information.
 * Public labels: confirmed → none, probable → "na podstawie relacji",
 * lore → "lokalne lore", rumor → "niepotwierdzone".
 */
export type Confidence = "confirmed" | "probable" | "lore" | "rumor";

export interface Person {
  /** URL slug, e.g. `marek` → `/osoba/marek`. */
  id: PersonId;
  name: string;
  nickname?: string;
  /** Extra search terms (other spellings, old nicknames). */
  aliases?: string[];
  /** Short bio shown under the name: "Znany głównie z…". */
  bio: string;
  /** Optional quote-like line: "Legenda głosi, że…". */
  legend?: string;
  /** Optional image; when missing the UI renders initials. */
  avatarUrl?: string;
  category: PersonCategory;
  /** First year the person is "on the map". Used by the timeline. */
  firstSeen?: number;
  /** Only set in admin preview, so drafts can be labelled. */
  status?: ContentStatus;
}

export type RelationshipType =
  | "znajomi"
  | "rodzina"
  | "szkola"
  | "praca"
  | "osiedle"
  | "sasiedztwo"
  | "imprezy"
  | "sport"
  | "akcje"
  | "biznes"
  | "z-widzenia"
  | "podobno"
  | "duet"
  | "inne";

export type RelationshipTone = "pozytywna" | "neutralna" | "zabawna" | "skomplikowana";

export interface Relationship {
  /** URL slug, e.g. `marek-krzysiek` → `/relacja/marek-krzysiek`. */
  id: RelationshipId;
  personA: PersonId;
  personB: PersonId;
  type: RelationshipType;
  /** 0–1, drives line thickness and link distance. */
  strength: number;
  /** Year the relationship started, when known. */
  since?: number;
  /** Year it ended, if it did. Used by the timeline. */
  until?: number;
  description: string;
  confidence?: Confidence;
  tone?: RelationshipTone;
  location?: Place;
  status?: ContentStatus;
}

export interface LoreEvent {
  id: EventId;
  /** Events without a known year are listed after dated ones. */
  year?: number;
  /** 1–12, optional; only used for sorting within a year. */
  month?: number;
  title: string;
  description?: string;
  /** People involved. An event shows up in each of their lore timelines. */
  people: PersonId[];
  /** Relationships this event belongs to ("Jak się poznali?"). */
  relationshipIds: RelationshipId[];
  location?: Place;
  confidence?: Confidence;
}

export type LoreType = "historia" | "ciekawostka" | "cytat" | "legenda" | "inside-joke" | "plotka";

/** A piece of local lore: fun fact, quote, legend… optionally tied to people. */
export interface LoreEntry {
  id: string;
  title?: string;
  content: string;
  type: LoreType;
  year?: number;
  confidence: Confidence;
  people: PersonId[];
}

/** Everything the public app needs, as returned by a data source. */
export interface Dataset {
  people: Person[];
  relationships: Relationship[];
  events: LoreEvent[];
  lore: LoreEntry[];
}
