import type { Person } from "@/types/domain";
import { normalizeText } from "./format";

/**
 * Ranks people by how well `query` matches name / nickname / aliases.
 * Prefix matches win over substring matches. Diacritics are ignored.
 */
export function searchPeople(people: Person[], query: string, limit = 8): Person[] {
  const q = normalizeText(query.trim());
  if (!q) return [];
  const scored: { person: Person; score: number }[] = [];

  for (const person of people) {
    const fields = [person.name, person.nickname ?? "", ...(person.aliases ?? [])].map(normalizeText);
    let score = 0;
    for (const field of fields) {
      if (!field) continue;
      if (field === q) score = Math.max(score, 3);
      else if (field.startsWith(q) || field.split(/\s+/).some((w) => w.startsWith(q))) score = Math.max(score, 2);
      else if (field.includes(q)) score = Math.max(score, 1);
    }
    if (score > 0) scored.push({ person, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name, "pl"))
    .slice(0, limit)
    .map((s) => s.person);
}
