import { describe, expect, it } from "vitest";
import { personSchema, relationshipSchema, eventSchema, loreSchema, locationSchema } from "@/lib/validations/entities";
import { idsSchema } from "@/lib/validations/common";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const person = {
  firstName: "Marek",
  slug: "marek",
  bio: "",
  category: "bywalec" as const,
  status: "draft" as const,
  tags: [],
  aliases: [],
};

const relationship = {
  personA: A,
  personB: B,
  type: "znajomi" as const,
  strength: 80,
  description: "",
  confidence: "confirmed" as const,
  sourceType: "personal" as const,
  status: "draft" as const,
};

describe("person validation", () => {
  it("accepts a minimal person and normalizes empty optionals to null", () => {
    const out = personSchema.parse({ ...person, nickname: "", firstSeen: "", birthDate: "" });
    expect(out.nickname).toBeNull();
    expect(out.firstSeen).toBeNull();
    expect(out.birthDate).toBeNull();
  });

  it("requires a first name", () => {
    const r = personSchema.safeParse({ ...person, firstName: "   " });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["firstName"]);
  });

  it("requires a valid slug", () => {
    expect(personSchema.safeParse({ ...person, slug: "" }).success).toBe(false);
    expect(personSchema.safeParse({ ...person, slug: "Łysy" }).success).toBe(false);
    expect(personSchema.safeParse({ ...person, slug: "marek--k" }).success).toBe(false);
    expect(personSchema.safeParse({ ...person, slug: "marek-kowalski-2" }).success).toBe(true);
  });

  it("parses year strings to numbers and rejects nonsense", () => {
    expect(personSchema.parse({ ...person, firstSeen: "2019" }).firstSeen).toBe(2019);
    expect(personSchema.safeParse({ ...person, firstSeen: "19" }).success).toBe(false);
    expect(personSchema.safeParse({ ...person, firstSeen: "3000" }).success).toBe(false);
  });

  it("deduplicates tags", () => {
    expect(personSchema.parse({ ...person, tags: ["sport", "sport", "szkoła"] }).tags).toEqual(["sport", "szkoła"]);
  });
});

describe("relationship validation", () => {
  it("accepts a valid relationship", () => {
    expect(relationshipSchema.safeParse(relationship).success).toBe(true);
  });

  it("blocks self relationships", () => {
    const r = relationshipSchema.safeParse({ ...relationship, personB: A });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "personB" && /sama ze sobą/.test(i.message))).toBe(true);
  });

  it("requires both people", () => {
    expect(relationshipSchema.safeParse({ ...relationship, personA: "" }).success).toBe(false);
    expect(relationshipSchema.safeParse({ ...relationship, personB: "" }).success).toBe(false);
  });

  it("keeps strength within 0–100", () => {
    expect(relationshipSchema.safeParse({ ...relationship, strength: 101 }).success).toBe(false);
    expect(relationshipSchema.safeParse({ ...relationship, strength: -1 }).success).toBe(false);
  });

  it("rejects an end before the start", () => {
    expect(relationshipSchema.safeParse({ ...relationship, sinceYear: "2020", untilYear: "2019" }).success).toBe(false);
    expect(relationshipSchema.safeParse({ ...relationship, sinceDate: "2020-05-01", untilYear: "2021" }).success).toBe(true);
  });
});

describe("event / lore / location validation", () => {
  const base = { people: [], relationships: [], confidence: "confirmed" as const, sourceType: "unknown" as const, status: "draft" as const };
  it("event title is required", () => {
    expect(eventSchema.safeParse({ ...base, title: "" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, title: "Legendarny grill", year: "2021" }).success).toBe(true);
  });

  it("lore content is required", () => {
    const lore = { loreType: "plotka" as const, confidence: "rumor" as const, sourceType: "unknown" as const, people: [], status: "draft" as const };
    expect(loreSchema.safeParse({ ...lore, content: " " }).success).toBe(false);
    expect(loreSchema.safeParse({ ...lore, content: "Podobno…" }).success).toBe(true);
  });

  it("location needs both coordinates or none", () => {
    expect(locationSchema.safeParse({ name: "Boisko", lat: "49.9", lng: "" }).success).toBe(false);
    expect(locationSchema.parse({ name: "Boisko", lat: "49,9118", lng: "19.0066" }).lat).toBeCloseTo(49.9118);
  });
});

describe("id validation", () => {
  // Seed rows use md5(...)::uuid, whose version/variant bits are not RFC 9562.
  const seedId = "0ec93dc7-9838-e2ea-e9aa-a0ba61785be8";

  it("accepts any Postgres uuid, including md5-derived seed ids", () => {
    expect(idsSchema.safeParse({ ids: [seedId, A] }).success).toBe(true);
    expect(relationshipSchema.safeParse({ ...relationship, personA: seedId }).success).toBe(true);
  });

  it("rejects malformed ids", () => {
    expect(idsSchema.safeParse({ ids: ["not-a-uuid"] }).success).toBe(false);
  });
});
