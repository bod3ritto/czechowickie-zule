import type { PersonId, RelationshipId } from "@/types/domain";

export interface GraphApi {
  zoomIn(): void;
  zoomOut(): void;
  /** Fit all visible people (or only `ids`) into view. */
  fit(ids?: PersonId[]): void;
  centerOn(id: PersonId): void;
}

/** What the graph should emphasise. Everything else is dimmed. */
export type Emphasis =
  | { kind: "none" }
  | { kind: "person"; id: PersonId }
  | { kind: "relationship"; id: RelationshipId }
  | { kind: "path"; people: PersonId[]; relationships: RelationshipId[] };
