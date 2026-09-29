"use client";

import { useEffect, useId, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { cn, countLabel } from "@/lib/format";
import { useMap } from "./map-context";

const STEP_MS = 1100;

/** Year slider + "Replay" that grows the network year by year. */
export function TimelineBar({ panelOpen }: { panelOpen: boolean }) {
  const { year, yearRange, setYear, setTimelineOpen, visible } = useMap();
  const [min, max] = yearRange;
  const [playing, setPlaying] = useState(false);
  const sliderId = useId();
  const current = year ?? max;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (current >= max) setPlaying(false);
      else setYear(current + 1);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [playing, current, max, setYear]);

  const togglePlay = () => {
    if (!playing && current >= max) setYear(min);
    setPlaying((p) => !p);
  };

  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div
      className={cn(
        "animate-pop absolute inset-x-3 bottom-3 z-20 mx-auto max-w-2xl rounded-xl border border-line bg-surface/90 p-3 shadow-2xl backdrop-blur sm:bottom-4",
        panelOpen && "max-md:hidden md:right-[400px] lg:right-[440px]",
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Zatrzymaj replay" : "Odtwórz rozwój sieci"}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <label htmlFor={sliderId} className="text-sm font-semibold tabular-nums text-fg">
              {current}
            </label>
            <span className="truncate font-mono text-[10px] text-fg-subtle">
              {countLabel(visible.people.size, "osoba", "osoby", "osób")} · {countLabel(visible.relationships.size, "relacja", "relacje", "relacji")}
            </span>
          </div>
          <input
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={1}
            value={current}
            onChange={(e) => {
              setPlaying(false);
              setYear(Number(e.target.value));
            }}
            aria-valuetext={`Rok ${current}`}
            className="timeline-range w-full"
          />
          <div className="mt-0.5 flex justify-between font-mono text-[9px] text-fg-subtle" aria-hidden="true">
            {years.filter((y, i) => i === 0 || i === years.length - 1 || (y - min) % 2 === 0).map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTimelineOpen(false)}
          aria-label="Zamknij oś czasu"
          className="grid size-8 shrink-0 place-items-center self-start rounded-md text-fg-muted hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
