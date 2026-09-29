import { describe, expect, it } from "vitest";
import {
  commonConnections,
  degreeOf,
  findExistingRelationship,
  findSimilarPeople,
  pairKey,
  slugify,
  uniqueSlug,
  type NetworkPerson,
} from "@/lib/admin/network";
import { buildGraphIndex } from "@/lib/graph/model";
import { shortestPath } from "@/lib/graph/algorithms";
import { loadStaticDataset } from "@/lib/data/static-source";
import { analyzeImport, importSchema } from "@/lib/validations/import";

const rels = [
  { id: "r1", personA: "marek", personB: "krzychu" },
  { id: "r2", personA: "arek", personB: "marek" },
  { id: "r3", personA: "krzychu", personB: "arek" },
  { id: "r4", personA: "bartek", personB: "marek" },
];

describe("undirected relationships", () => {
  it("pairKey is order independent", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
  });

  it("finds an existing relationship in either direction (duplicate protection)", () => {
    expect(findExistingRelationship(rels, "krzychu", "marek")?.id).toBe("r1");
    expect(findExistingRelationship(rels, "marek", "krzychu")?.id).toBe("r1");
    expect(findExistingRelationship(rels, "bartek", "arek")).toBeUndefined();
  });

  it("ignores the relationship being edited", () => {
    expect(findExistingRelationship(rels, "marek", "krzychu", "r1")).toBeUndefined();
  });

  it("counts degrees and common connections", () => {
    expect(degreeOf(rels, "marek")).toBe(3);
    expect(commonConnections(rels, "marek", "arek")).toEqual(["krzychu"]);
  });
});

describe("slugs", () => {
  it("slugifies Polish names", () => {
    expect(slugify("Łysy Żółć")).toBe("lysy-zolc");
    expect(slugify("  Krzysiek „Mały” ")).toBe("krzysiek-maly");
  });

  it("finds the next free slug", () => {
    expect(uniqueSlug("marek", [])).toBe("marek");
    expect(uniqueSlug("marek", ["marek", "marek-2"])).toBe("marek-3");
  });
});

describe("duplicate people detection", () => {
  const person = (id: string, name: string, nickname: string | null = null, aliases: string[] = []): NetworkPerson => ({
    id,
    slug: id,
    name,
    lastName: null,
    nickname,
    aliases,
    category: "bywalec",
    status: "published",
    avatarUrl: null,
    bio: "",
  });
  const people = [person("krzysztof", "Krzysztof", "Krzychu"), person("marek", "Marek"), person("lysy", "Łysy", null, ["Mirek"])];

  it("suggests Krzysztof „Krzychu” for Krzysiek", () => {
    expect(findSimilarPeople(people, { name: "Krzysiek" }).map((p) => p.id)).toEqual(["krzysztof"]);
  });

  it("matches ignoring diacritics and aliases", () => {
    expect(findSimilarPeople(people, { name: "Lysy" }).map((p) => p.id)).toEqual(["lysy"]);
    // Alias hit; "Marek" (1 letter away) is also suggested — advisory, the admin decides.
    expect(findSimilarPeople(people, { name: "Mirek" }).map((p) => p.id)).toContain("lysy");
  });

  it("does not flag unrelated names", () => {
    expect(findSimilarPeople(people, { name: "Zbyszek" })).toEqual([]);
  });
});

describe("shortest path", () => {
  const index = buildGraphIndex(loadStaticDataset());

  it("finds a direct connection", () => {
    const path = shortestPath(index, "marek", "krzysiek");
    expect(path?.map((s) => s.personId)).toEqual(["marek", "krzysiek"]);
  });

  it("finds the shortest multi-hop chain", () => {
    const path = shortestPath(index, "ewka", "grzesiu");
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3);
    expect(path![0].personId).toBe("ewka");
    expect(path![2].personId).toBe("grzesiu");
    // Every step is connected by the relationship it lists.
    for (let i = 1; i < path!.length; i++) {
      const via = path![i].via!;
      expect([via.personA, via.personB]).toContain(path![i - 1].personId);
      expect([via.personA, via.personB]).toContain(path![i].personId);
    }
  });

  it("returns null when there is no connection", () => {
    const isolated = buildGraphIndex({
      people: [
        { id: "a", name: "A", bio: "", category: "bywalec" },
        { id: "b", name: "B", bio: "", category: "bywalec" },
      ],
      relationships: [],
      events: [],
      lore: [],
    });
    expect(shortestPath(isolated, "a", "b")).toBeNull();
  });
});

describe("import preview", () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("rejects files with an unknown version", () => {
    expect(importSchema.safeParse({ version: 2 }).success).toBe(false);
  });

  it("counts entities and warns about duplicates", () => {
    const payload = importSchema.parse({
      version: 1,
      people: [
        { id: id(1), slug: "marek", first_name: "Marek" },
        { id: id(2), slug: "arek", first_name: "Arek" },
      ],
      relationships: [
        { id: id(10), slug: "marek-arek", person_a: id(1), person_b: id(2), type: "znajomi" },
        { id: id(11), slug: "arek-marek", person_a: id(2), person_b: id(1), type: "praca" },
      ],
    });
    const preview = analyzeImport(payload, { people: [{ id: id(99), slug: "marek" }], relationships: [] });
    expect(preview.counts.people).toBe(2);
    expect(preview.counts.relationships).toBe(2);
    expect(preview.warnings.some((w) => w.includes("„marek”"))).toBe(true);
    expect(preview.warnings.some((w) => w.includes("dubluje"))).toBe(true);
  });
});
