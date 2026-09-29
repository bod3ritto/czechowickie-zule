import { MapPin } from "lucide-react";
import type { LoreEvent } from "@/types/domain";
import { CONFIDENCE_BADGE } from "@/lib/relationship-types";

/** Chronological list of events, grouped by year. */
export function LoreTimeline({ events, empty }: { events: LoreEvent[]; empty: string }) {
  if (events.length === 0) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-sm text-fg-subtle">{empty}</p>;
  }
  return (
    <ol className="relative ml-1 border-l border-line">
      {events.map((event, i) => {
        const showYear = i === 0 || events[i - 1].year !== event.year;
        return (
          <li key={event.id} className="relative pb-5 pl-5 last:pb-0">
            <span
              className="absolute -left-[4.5px] top-1.5 size-2 rounded-full border border-line-strong bg-surface"
              aria-hidden="true"
            />
            {showYear && (
              <p className="mb-0.5 font-mono text-[11px] font-medium text-brand">{event.year ?? "Data nieznana"}</p>
            )}
            <h3 className="text-sm font-medium text-fg">{event.title}</h3>
            {event.confidence && CONFIDENCE_BADGE[event.confidence] && (
              <p className="font-mono text-[10px] text-fg-subtle">{CONFIDENCE_BADGE[event.confidence]}</p>
            )}
            {event.description && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{event.description}</p>}
            {event.location && (
              <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
                <MapPin className="size-3" aria-hidden="true" />
                {event.location.name}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
