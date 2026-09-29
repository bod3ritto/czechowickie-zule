import { normalizeText } from "@/lib/format";
import type { PersonCategory, RelationshipType } from "@/types/domain";
import type { Status } from "@/lib/db/enums";

/**
 * Lightweight, serializable view of the whole network used across the admin
 * (pickers, duplicate checks, previews, graph, search).
 */
export interface NetworkPerson {
  id: string;
  slug: string;
  name: string;
  lastName: string | null;
  nickname: string | null;
  aliases: string[];
  category: PersonCategory;
  status: Status;
  avatarUrl: string | null;
  bio: string;
}

export interface NetworkRelationship {
  id: string;
  slug: string;
  personA: string;
  personB: string;
  type: RelationshipType;
  strength: number;
  since: number | null;
  status: Status;
}

export interface Network {
  people: NetworkPerson[];
  relationships: NetworkRelationship[];
}

/** Order-independent key: relationships are undirected. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function findExistingRelationship<T extends { personA: string; personB: string; id: string }>(
  relationships: T[],
  a: string,
  b: string,
  ignoreId?: string,
): T | undefined {
  const key = pairKey(a, b);
  return relationships.find((r) => r.id !== ignoreId && pairKey(r.personA, r.personB) === key);
}

export function degreeOf(relationships: { personA: string; personB: string }[], id: string): number {
  let n = 0;
  for (const r of relationships) if (r.personA === id || r.personB === id) n++;
  return n;
}

export function commonConnections(relationships: { personA: string; personB: string }[], a: string, b: string): string[] {
  const neighbors = (id: string) => {
    const set = new Set<string>();
    for (const r of relationships) {
      if (r.personA === id) set.add(r.personB);
      else if (r.personB === id) set.add(r.personA);
    }
    return set;
  };
  const na = neighbors(a);
  return [...neighbors(b)].filter((id) => na.has(id) && id !== a && id !== b);
}

export function personLabel(p: Pick<NetworkPerson, "name" | "nickname">): string {
  return p.nickname && p.nickname !== p.name ? `${p.name} „${p.nickname}”` : p.name;
}

// ----------------------------------------------------------------- slugs ----
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** `base`, `base-2`, `base-3`… first one not in `taken`. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  const root = base || "wpis";
  if (!set.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!set.has(candidate)) return candidate;
  }
}

// ------------------------------------------------------------ duplicates ----
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  if (commonPrefix(a, b) >= 4) return true;
  return Math.min(a.length, b.length) >= 4 && levenshtein(a, b) <= 2;
}

/**
 * "Możliwe podobne osoby": fuzzy match on name / nickname / aliases, e.g.
 * "Krzysiek" → Krzysztof „Krzychu”. Advisory only; the admin decides.
 */
export function findSimilarPeople(
  people: NetworkPerson[],
  input: { name?: string; nickname?: string | null },
  excludeId?: string,
  limit = 5,
): NetworkPerson[] {
  const queries = [input.name, input.nickname].map((v) => normalizeText(v ?? "").trim()).filter((v) => v.length >= 3);
  if (queries.length === 0) return [];
  return people
    .filter((p) => p.id !== excludeId)
    .filter((p) => {
      const fields = [p.name, p.nickname ?? "", ...p.aliases].map((f) => normalizeText(f).trim());
      return queries.some((q) => fields.some((f) => similar(q, f)));
    })
    .slice(0, limit);
}
