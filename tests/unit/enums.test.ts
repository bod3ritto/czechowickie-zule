import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as enums from "@/lib/db/enums";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";

const sql = readFileSync(resolve(__dirname, "../../supabase/migrations/20260929000001_schema.sql"), "utf8");

function sqlEnum(name: string): string[] {
  const match = sql.match(new RegExp(`create type public\\.${name} as enum \\(([^;]+)\\);`));
  if (!match) throw new Error(`enum ${name} not found`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
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
});
