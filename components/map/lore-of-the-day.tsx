"use client";

import { useMemo, useState } from "react";
import { Flame, RefreshCw } from "lucide-react";
import { useClientDay } from "@/lib/hooks";
import { cn } from "@/lib/format";
import { CONFIDENCE_BADGE } from "@/lib/relationship-types";
import { useMap } from "./map-context";

/** "🔥 Lore dnia": a fun fact that changes daily (and on demand). */
export function LoreOfTheDay({ className }: { className?: string }) {
  const { index, selectPerson } = useMap();
  const day = useClientDay();
  const [offset, setOffset] = useState(0);

  const facts = useMemo(
    () =>
      index.dataset.lore.flatMap((entry) => {
        const person = index.people.get(entry.people[0]);
        return person ? [{ person, fact: entry.content, confidence: entry.confidence }] : [];
      }),
    [index],
  );

  if (day === null || facts.length === 0) return null;
  // Multiply by a prime so consecutive days jump around the list.
  const item = facts[(day * 7919 + offset) % facts.length];

  return (
    <section
      aria-label="Lore dnia"
      className={cn(
        "animate-fade-in w-full max-w-[300px] rounded-xl border border-line bg-surface/85 p-3.5 shadow-xl backdrop-blur max-md:max-w-[calc(100vw-80px)]",
        className,
      )}
    >
      <header className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          <Flame className="size-3 text-orange-400" aria-hidden="true" /> Lore dnia
        </h2>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Inna ciekawostka"
          className="grid size-6 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
        >
          <RefreshCw className="size-3" />
        </button>
      </header>
      <p className="text-[13px] leading-relaxed text-fg">„{item.fact}”</p>
      {CONFIDENCE_BADGE[item.confidence] && (
        <p className="mt-1 font-mono text-[10px] text-fg-subtle">· {CONFIDENCE_BADGE[item.confidence]}</p>
      )}
      <button
        type="button"
        onClick={() => selectPerson(item.person.id)}
        className="mt-2 font-mono text-[11px] text-fg-muted underline-offset-2 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        — {item.person.name}
        {item.person.nickname && item.person.nickname !== item.person.name ? ` „${item.person.nickname}”` : ""} →
      </button>
    </section>
  );
}
