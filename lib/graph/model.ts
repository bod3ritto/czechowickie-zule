import type {
  Dataset,
  LoreEntry,
  LoreEvent,
  Person,
  PersonId,
  Relationship,
  RelationshipId,
} from "@/types/domain";

export interface Edge {
  neighbor: PersonId;
  relationship: Relationship;
}

/**
 * Pre-computed lookups over a dataset. Built once (server or client) so every
 * query is O(1)/O(degree) instead of scanning arrays — this is what keeps the
 * UI responsive with 1000+ people.
 */
export interface GraphIndex {
  dataset: Dataset;
  people: Map<PersonId, Person>;
  relationships: Map<RelationshipId, Relationship>;
  adjacency: Map<PersonId, Edge[]>;
  eventsByPerson: Map<PersonId, LoreEvent[]>;
  eventsByRelationship: Map<RelationshipId, LoreEvent[]>;
  loreByPerson: Map<PersonId, LoreEntry[]>;
  maxDegree: number;
}

/** Chronological; events without a year go last. */
export function sortEvents(a: Pick<LoreEvent, "year" | "month">, b: Pick<LoreEvent, "year" | "month">): number {
  const ay = a.year ?? Number.POSITIVE_INFINITY;
  const by = b.year ?? Number.POSITIVE_INFINITY;
  if (ay !== by) return ay - by;
  return (a.month ?? 0) - (b.month ?? 0);
}

export function buildGraphIndex(dataset: Dataset): GraphIndex {
  const people = new Map(dataset.people.map((p) => [p.id, p]));
  const relationships = new Map(dataset.relationships.map((r) => [r.id, r]));
  const adjacency = new Map<PersonId, Edge[]>(dataset.people.map((p) => [p.id, []]));

  for (const rel of dataset.relationships) {
    adjacency.get(rel.personA)?.push({ neighbor: rel.personB, relationship: rel });
    adjacency.get(rel.personB)?.push({ neighbor: rel.personA, relationship: rel });
  }

  const eventsByPerson = new Map<PersonId, LoreEvent[]>();
  const eventsByRelationship = new Map<RelationshipId, LoreEvent[]>();
  for (const event of [...dataset.events].sort(sortEvents)) {
    for (const id of event.people) {
      const list = eventsByPerson.get(id) ?? [];
      list.push(event);
      eventsByPerson.set(id, list);
    }
    for (const relId of event.relationshipIds) {
      const list = eventsByRelationship.get(relId) ?? [];
      list.push(event);
      eventsByRelationship.set(relId, list);
    }
  }

  const loreByPerson = new Map<PersonId, LoreEntry[]>();
  for (const entry of dataset.lore) {
    for (const id of entry.people) {
      const list = loreByPerson.get(id) ?? [];
      list.push(entry);
      loreByPerson.set(id, list);
    }
  }

  let maxDegree = 0;
  for (const edges of adjacency.values()) maxDegree = Math.max(maxDegree, edges.length);

  return { dataset, people, relationships, adjacency, eventsByPerson, eventsByRelationship, loreByPerson, maxDegree };
}

export function neighborsOf(index: GraphIndex, id: PersonId): Set<PersonId> {
  return new Set((index.adjacency.get(id) ?? []).map((e) => e.neighbor));
}

export function otherEnd(rel: Relationship, id: PersonId): PersonId {
  return rel.personA === id ? rel.personB : rel.personA;
}
