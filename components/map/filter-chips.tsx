"use client";

import { FILTERS, RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { cn } from "@/lib/format";
import { useMap } from "./map-context";

const FILTER_COLOR: Record<string, string | undefined> = Object.fromEntries(
  Object.values(RELATIONSHIP_TYPES).map((m) => [m.filter, m.color]),
);

export function FilterChips() {
  const { filter, setFilter } = useMap();
  return (
    <div role="radiogroup" aria-label="Typ relacji" className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const active = filter === f.key;
        const color = f.key === "all" ? undefined : FILTER_COLOR[f.key];
        return (
          <button
            key={f.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setFilter(f.key)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors",
              "focus-visible:outline-2 focus-visible:outline-brand",
              active
                ? "border-fg/40 bg-white/[0.08] text-fg"
                : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
