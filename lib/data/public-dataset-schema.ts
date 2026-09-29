import { z } from "zod";
import type { Dataset } from "@/types/domain";
import {
  CONFIDENCE_VALUES,
  LORE_TYPE_VALUES,
  PERSON_CATEGORY_VALUES,
  RELATIONSHIP_TONE_VALUES,
  RELATIONSHIP_TYPE_VALUES,
  STATUS_VALUES,
} from "@/lib/db/enums";

/**
 * Runtime check of what `public.public_dataset()` returns, so a schema
 * mismatch fails loudly at the boundary instead of deep in the UI.
 */
const place = z.object({ name: z.string(), lat: z.number(), lng: z.number() });

const person = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  bio: z.string(),
  legend: z.string().optional(),
  category: z.enum(PERSON_CATEGORY_VALUES),
  firstSeen: z.number().int().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  /** Storage path of the avatar; turned into a URL by the data source. */
  avatarPath: z.string().optional(),
});

const relationship = z.object({
  id: z.string(),
  personA: z.string(),
  personB: z.string(),
  type: z.enum(RELATIONSHIP_TYPE_VALUES),
  /** 0–100 in the database. */
  strength: z.number(),
  since: z.number().int().optional(),
  until: z.number().int().optional(),
  description: z.string(),
  tone: z.enum(RELATIONSHIP_TONE_VALUES).optional(),
  confidence: z.enum(CONFIDENCE_VALUES).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  location: place.optional(),
});

const event = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  year: z.number().int().optional(),
  month: z.number().int().optional(),
  confidence: z.enum(CONFIDENCE_VALUES).optional(),
  people: z.array(z.string()),
  relationshipIds: z.array(z.string()),
  location: place.optional(),
});

const lore = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string(),
  type: z.enum(LORE_TYPE_VALUES),
  year: z.number().int().optional(),
  confidence: z.enum(CONFIDENCE_VALUES),
  people: z.array(z.string()),
});

export const datasetSchema = z.object({
  people: z.array(person),
  relationships: z.array(relationship),
  events: z.array(event),
  lore: z.array(lore),
});

export type RawPublicDataset = z.infer<typeof datasetSchema>;

/** Converts the RPC payload to the public domain model. */
export function toDataset(raw: RawPublicDataset, avatarUrl: (path: string) => string): Dataset {
  return {
    people: raw.people.map(({ avatarPath, ...p }) => ({ ...p, avatarUrl: avatarPath ? avatarUrl(avatarPath) : undefined })),
    relationships: raw.relationships.map((r) => ({ ...r, strength: r.strength / 100 })),
    events: raw.events,
    lore: raw.lore,
  };
}
