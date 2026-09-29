import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as enums from "@/lib/db/enums";
import { PERSON_CATEGORIES, RELATIONSHIP_TYPES } from "@/lib/relationship-types";

const dir = resolve(__dirname, "../../supabase/migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(resolve(dir, f), "utf8"))
  .join("\n");

/** Values from `create type … as enum (…)` plus later `alter type … add value`. */
function sqlEnum(name: string): string[] {
  const match = sql.match(new RegExp(`create type public\\.${name} as enum \\(([^;]+)\\);`));
  if (!match) throw new Error(`enum ${name} not found`);
  const added = [...sql.matchAll(new RegExp(`alter type public\\.${name} add value (?:if not exists )?'([^']+)'`, "g"))].map((m) => m[1]);
  return [...[...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]), ...added];
}

describe("TypeScript enums mirror the SQL schema", () => {
  it.each([
    ["content_status", enums.STATUS_VALUES],
    ["confidence_level", enums.CONFIDENCE_VALUES],
    ["source_type", enums.SOURCE_TYPE_VALUES],
    ["person_category", enums.PERSON_CATEGORY_VALUES],
    ["relationship_type", enums.RELATIONSHIP_TYPE_VALUES],
    ["relationship_tone", enums.RELATIONSHIP_TONE_VALUES],
    ["lore_type", enums.LORE_TYPE_VALUES],
    ["media_kind", enums.MEDIA_KIND_VALUES],
  ])("%s", (name, values) => {
    expect([...values].sort()).toEqual(sqlEnum(name).sort());
  });

  it("every relationship type has a label and color", () => {
    for (const t of enums.RELATIONSHIP_TYPE_VALUES) expect(RELATIONSHIP_TYPES[t]).toBeDefined();
  });

  it("every person category has a label and a distinct color", () => {
    for (const c of enums.PERSON_CATEGORY_VALUES) expect(PERSON_CATEGORIES[c]).toBeDefined();
    const colors = enums.PERSON_CATEGORY_VALUES.map((c) => PERSON_CATEGORIES[c].color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });
});
