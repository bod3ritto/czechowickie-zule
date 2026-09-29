import type { PersonId, Relationship } from "@/types/domain";
import type { GraphIndex } from "./model";

export interface PathStep {
  personId: PersonId;
  /** Relationship leading to this person from the previous step (absent for the first). */
  via?: Relationship;
}

/**
 * Breadth-first search → shortest chain of acquaintances between two people.
 * `allowed` optionally restricts which relationships may be used (e.g. current filter).
 */
export function shortestPath(
  index: GraphIndex,
  from: PersonId,
  to: PersonId,
  allowed?: (rel: Relationship) => boolean,
): PathStep[] | null {
  if (from === to) return [{ personId: from }];
  const prev = new Map<PersonId, { from: PersonId; via: Relationship }>();
  const visited = new Set<PersonId>([from]);
  const queue: PersonId[] = [from];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const edge of index.adjacency.get(current) ?? []) {
      if (visited.has(edge.neighbor)) continue;
      if (allowed && !allowed(edge.relationship)) continue;
      visited.add(edge.neighbor);
      prev.set(edge.neighbor, { from: current, via: edge.relationship });
      if (edge.neighbor === to) {
        const path: PathStep[] = [];
        let cursor: PersonId = to;
        while (cursor !== from) {
          const step = prev.get(cursor)!;
          path.unshift({ personId: cursor, via: step.via });
          cursor = step.from;
        }
        path.unshift({ personId: from });
        return path;
      }
      queue.push(edge.neighbor);
    }
  }
  return null;
}

/** Returns a map of person → distance (0 = origin) up to `maxDepth`. */
export function neighborhood(
  index: GraphIndex,
  origin: PersonId,
  maxDepth: number,
  allowed?: (rel: Relationship) => boolean,
): Map<PersonId, number> {
  const depth = new Map<PersonId, number>([[origin, 0]]);
  let frontier: PersonId[] = [origin];
  for (let d = 1; d <= maxDepth && frontier.length > 0; d++) {
    const next: PersonId[] = [];
    for (const id of frontier) {
      for (const edge of index.adjacency.get(id) ?? []) {
        if (depth.has(edge.neighbor)) continue;
        if (allowed && !allowed(edge.relationship)) continue;
        depth.set(edge.neighbor, d);
        next.push(edge.neighbor);
      }
    }
    frontier = next;
  }
  return depth;
}

export function commonNeighbors(index: GraphIndex, a: PersonId, b: PersonId): PersonId[] {
  const aSet = new Set((index.adjacency.get(a) ?? []).map((e) => e.neighbor));
  const result = new Set<PersonId>();
  for (const edge of index.adjacency.get(b) ?? []) {
    if (aSet.has(edge.neighbor) && edge.neighbor !== a) result.add(edge.neighbor);
  }
  return [...result];
}
