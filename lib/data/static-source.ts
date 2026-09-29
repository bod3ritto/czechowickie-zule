import type { Dataset, LoreEntry, Person, Relationship } from "@/types/domain";
import { people } from "@/data/people";
import { relationships } from "@/data/relationships";
import { events } from "@/data/events";
import { lore } from "@/data/lore";

/** Converts the hand-editable `data/*.ts` files into the public dataset. */
export function loadStaticDataset(): Dataset {
  const funFacts: LoreEntry[] = people.flatMap((p) =>
    p.funFacts.map((content, i) => ({
      id: `ff-${p.id}-${i}`,
      content,
      type: "ciekawostka" as const,
      confidence: "confirmed" as const,
      people: [p.id],
    })),
  );

  return {
    people: people.map(
      ({ funFacts: _f, lastName: _l, tags: _t, ...person }): Person => person, // eslint-disable-line @typescript-eslint/no-unused-vars
    ),
    relationships: relationships.map((r): Relationship => ({ ...r })),
    events: events.map((e) => ({ ...e, relationshipIds: e.relationshipIds ?? [] })),
    lore: [...funFacts, ...lore],
  };
}
