import type { Person, PersonId, Relationship, RelationshipType } from "@/types/domain";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import type { GraphIndex } from "./model";

export interface PersonStats {
  friends: number;
  relationships: number;
  longest: { relationship: Relationship; other: PersonId; years: number } | null;
  topType: { type: RelationshipType; label: string; count: number } | null;
  events: number;
  legend: { level: number; label: string };
}

/** Playful description of how much lore surrounds someone. Not a score of the person. */
const LEGEND_LEVELS = [
  "Świeży w temacie",
  "Znany z widzenia",
  "Opowiadany na imprezach",
  "Żywa legenda",
  "Mit założycielski",
];

function mostCommonType(rels: Relationship[]): PersonStats["topType"] {
  const counts = new Map<RelationshipType, number>();
  for (const rel of rels) counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1);
  let best: PersonStats["topType"] = null;
  for (const [type, count] of counts) {
    if (!best || count > best.count) best = { type, label: RELATIONSHIP_TYPES[type].label, count };
  }
  return best;
}

export function personStats(index: GraphIndex, person: Person, currentYear: number): PersonStats {
  const edges = index.adjacency.get(person.id) ?? [];
  const rels = edges.map((e) => e.relationship);
  const events = index.eventsByPerson.get(person.id)?.length ?? 0;

  let longest: PersonStats["longest"] = null;
  for (const edge of edges) {
    const since = edge.relationship.since;
    if (since === undefined) continue;
    if (!longest || since < (longest.relationship.since ?? Infinity)) {
      longest = {
        relationship: edge.relationship,
        other: edge.neighbor,
        years: Math.max(0, (edge.relationship.until ?? currentYear) - since),
      };
    }
  }

  const loreCount = index.loreByPerson.get(person.id)?.length ?? 0;
  const lorePoints = events * 2 + loreCount + (person.legend ? 2 : 0) + (person.category === "legenda" ? 3 : 0);
  const level = Math.min(LEGEND_LEVELS.length, 1 + Math.floor(lorePoints / 3));

  return {
    friends: new Set(edges.map((e) => e.neighbor)).size,
    relationships: rels.length,
    longest,
    topType: mostCommonType(rels),
    events,
    legend: { level, label: LEGEND_LEVELS[level - 1] },
  };
}

export interface NetworkStats {
  people: number;
  relationships: number;
  events: number;
  topType: PersonStats["topType"];
  mostConnected: { person: Person; degree: number } | null;
  oldest: Relationship | null;
}

export function networkStats(index: GraphIndex): NetworkStats {
  const { people, relationships, events } = index.dataset;
  let mostConnected: NetworkStats["mostConnected"] = null;
  for (const person of people) {
    const degree = index.adjacency.get(person.id)?.length ?? 0;
    if (!mostConnected || degree > mostConnected.degree) mostConnected = { person, degree };
  }
  let oldest: Relationship | null = null;
  for (const rel of relationships) {
    if (rel.since !== undefined && (!oldest || rel.since < (oldest.since ?? Infinity))) oldest = rel;
  }

  return {
    people: people.length,
    relationships: relationships.length,
    events: events.length,
    topType: mostCommonType(relationships),
    mostConnected,
    oldest,
  };
}

/** Year range covered by the data, for the timeline slider. */
export function yearRange(index: GraphIndex): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const rel of index.dataset.relationships) {
    if (rel.since !== undefined) min = Math.min(min, rel.since);
    max = Math.max(max, rel.until ?? rel.since ?? -Infinity);
  }
  for (const p of index.dataset.people) if (p.firstSeen) min = Math.min(min, p.firstSeen);
  for (const e of index.dataset.events) if (e.year !== undefined) max = Math.max(max, e.year);
  if (!Number.isFinite(min)) return [2015, 2026];
  return [min, max];
}
