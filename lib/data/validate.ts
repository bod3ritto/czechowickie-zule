import type { Dataset } from "@/types/domain";

/**
 * Catches typos in hand-edited data (unknown person ids, duplicate ids)
 * at build time with a readable message instead of a broken graph.
 */
export function validateDataset(dataset: Dataset): string[] {
  const errors: string[] = [];
  const personIds = new Set<string>();
  const relIds = new Set<string>();

  for (const person of dataset.people) {
    if (personIds.has(person.id)) errors.push(`Zduplikowane id osoby: "${person.id}"`);
    if (!/^[a-z0-9-]+$/.test(person.id)) {
      errors.push(`Id osoby "${person.id}" może zawierać tylko a-z, 0-9 i "-"`);
    }
    personIds.add(person.id);
  }

  for (const rel of dataset.relationships) {
    if (relIds.has(rel.id)) errors.push(`Zduplikowane id relacji: "${rel.id}"`);
    relIds.add(rel.id);
    for (const end of [rel.personA, rel.personB]) {
      if (!personIds.has(end)) errors.push(`Relacja "${rel.id}" wskazuje na nieznaną osobę "${end}"`);
    }
    if (rel.personA === rel.personB) errors.push(`Relacja "${rel.id}" łączy osobę samą ze sobą`);
    if (rel.strength < 0 || rel.strength > 1) errors.push(`Relacja "${rel.id}": strength musi być w zakresie 0–1`);
  }

  for (const event of dataset.events) {
    for (const id of event.people) {
      if (!personIds.has(id)) errors.push(`Wydarzenie "${event.id}" wskazuje na nieznaną osobę "${id}"`);
    }
    for (const relId of event.relationshipIds) {
      if (!relIds.has(relId)) errors.push(`Wydarzenie "${event.id}" wskazuje na nieznaną relację "${relId}"`);
    }
  }

  for (const entry of dataset.lore) {
    for (const id of entry.people) {
      if (!personIds.has(id)) errors.push(`Lore "${entry.id}" wskazuje na nieznaną osobę "${id}"`);
    }
  }

  return errors;
}
