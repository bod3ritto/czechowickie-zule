import type { LoreEvent, Person, Relationship } from "@/types/domain";

/**
 * Shapes of the hand-editable files in `data/`. They are slightly friendlier
 * than the public model (e.g. fun facts inline on the person) and get
 * converted by `lib/data/static-source.ts` and `scripts/generate-seed.ts`.
 */
export interface SeedPerson extends Omit<Person, "status"> {
  lastName?: string;
  tags?: string[];
  /** Short fun facts → lore entries of type "ciekawostka". */
  funFacts: string[];
}

export type SeedRelationship = Omit<Relationship, "status">;

export type SeedEvent = Omit<LoreEvent, "relationshipIds"> & { relationshipIds?: string[] };
