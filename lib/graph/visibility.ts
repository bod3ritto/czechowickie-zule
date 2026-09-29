import type { PersonId, Relationship, RelationshipId } from "@/types/domain";
import { matchesFilter, type FilterKey } from "@/lib/relationship-types";
import { neighborhood } from "./algorithms";
import type { GraphIndex } from "./model";

export interface ViewOptions {
  filter: FilterKey;
  /** Timeline year; `null` = show everything. */
  year: number | null;
  /** When set, only this person's 1st and 2nd degree network is shown. */
  focusId: PersonId | null;
  /** Always keep these people visible (e.g. the selected person). */
  pinned?: PersonId[];
}

export interface VisibleGraph {
  people: Set<PersonId>;
  relationships: Set<RelationshipId>;
}

export function relationshipAllowed(rel: Relationship, opts: Pick<ViewOptions, "filter" | "year">): boolean {
  if (!matchesFilter(rel, opts.filter)) return false;
  if (opts.year !== null) {
    // Unknown start dates stay visible on the timeline.
    if (rel.since !== undefined && rel.since > opts.year) return false;
    if (rel.until !== undefined && rel.until < opts.year) return false;
  }
  return true;
}

/**
 * Decides which people/relationships the graph renders for the current
 * filter, timeline year and focus mode. Runs in O(V + E).
 */
export function computeVisibleGraph(index: GraphIndex, opts: ViewOptions): VisibleGraph {
  const allowed = (rel: Relationship) => relationshipAllowed(rel, opts);
  const relationships = new Set<RelationshipId>();
  const people = new Set<PersonId>();
  const unfiltered = opts.filter === "all" && opts.year === null;

  let scope: Map<PersonId, number> | null = null;
  if (opts.focusId && index.people.has(opts.focusId)) {
    scope = neighborhood(index, opts.focusId, 2, allowed);
  }

  for (const rel of index.dataset.relationships) {
    if (!allowed(rel)) continue;
    if (scope && !(scope.has(rel.personA) && scope.has(rel.personB))) continue;
    relationships.add(rel.id);
    people.add(rel.personA);
    people.add(rel.personB);
  }

  if (scope) {
    for (const id of scope.keys()) people.add(id);
  } else if (unfiltered) {
    for (const p of index.dataset.people) people.add(p.id);
  } else if (opts.year !== null) {
    // Timeline: people already "on the map" stay visible even without active links.
    for (const p of index.dataset.people) {
      if (p.firstSeen !== undefined && p.firstSeen <= opts.year && opts.filter === "all") people.add(p.id);
    }
  }

  for (const id of opts.pinned ?? []) if (index.people.has(id)) people.add(id);
  return { people, relationships };
}
