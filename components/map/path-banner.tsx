"use client";

import { Route, X } from "lucide-react";
import { countLabel } from "@/lib/format";
import { useMap } from "./map-context";

/** Floating chip shown while a "ścieżka znajomości" is highlighted on the graph. */
export function PathBanner() {
  const { path, index, showPath } = useMap();
  if (!path) return null;
  const names = path.steps.map((s) => index.people.get(s.personId)?.name ?? s.personId);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-3 sm:top-[72px]">
      <div className="animate-pop pointer-events-auto flex max-w-full items-center gap-3 rounded-lg border border-brand/30 bg-surface/90 py-1.5 pl-3 pr-1.5 text-sm shadow-xl backdrop-blur">
        <Route className="size-4 shrink-0 text-brand" aria-hidden="true" />
        <p className="min-w-0 truncate text-fg">
          {names.join(" → ")}
          <span className="ml-2 font-mono text-[11px] text-fg-subtle">{countLabel(path.steps.length - 1, "krok", "kroki", "kroków")}</span>
        </p>
        <button
          type="button"
          onClick={() => showPath(null)}
          aria-label="Ukryj ścieżkę"
          className="grid size-7 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
