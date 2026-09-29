"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { StatusBadge, ConfidenceBadge } from "@/components/admin/common/badges";
import { updateEventDate } from "@/lib/actions/events";
import { sortEvents } from "@/lib/graph/model";
import type { EventRow } from "@/lib/db/database.types";

type DateChange = { id: string; year: number | null; event_date: string | null };

function toSortable(e: EventRow) {
  return { year: e.year ?? (e.event_date ? Number(e.event_date.slice(0, 4)) : undefined), month: e.month ?? undefined };
}

/**
 * Chronological list of a person's events. Dates are edited inline and the
 * list re-sorts itself immediately (optimistic), then syncs with the server.
 */
export function EventTimeline({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ year: "", date: "" });
  const [optimistic, applyChange] = useOptimistic(events, (state, change: DateChange) =>
    state.map((e) => (e.id === change.id ? { ...e, year: change.year, event_date: change.event_date, month: change.event_date ? Number(change.event_date.slice(5, 7)) : null } : e)),
  );
  const sorted = [...optimistic].sort((a, b) => sortEvents(toSortable(a), toSortable(b)));

  const save = (id: string) => {
    const year = draft.year.trim();
    const date = draft.date.trim();
    if (year && !/^\d{4}$/.test(year)) return toast.error("Rok w formacie RRRR.");
    setEditing(null);
    startTransition(async () => {
      applyChange({ id, year: year ? Number(year) : date ? Number(date.slice(0, 4)) : null, event_date: date || null });
      const r = await updateEventDate({ id, year, eventDate: date });
      if (r.ok) {
        toast.success(r.message ?? "Zapisano.");
        router.refresh();
      } else toast.error(r.error);
    });
  };

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak wydarzeń z udziałem tej osoby.</p>;
  }

  return (
    <ol className="relative ml-2 border-l">
      {sorted.map((e) => {
        const year = toSortable(e).year;
        return (
          <li key={e.id} className="relative pb-5 pl-5 last:pb-0">
            <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border bg-background" aria-hidden="true" />
            {editing === e.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="h-8 w-24" placeholder="Rok" inputMode="numeric" maxLength={4} value={draft.year} onChange={(ev) => setDraft((d) => ({ ...d, year: ev.target.value }))} autoFocus />
                <span className="text-xs text-muted-foreground">lub</span>
                <Input className="h-8 w-40" type="date" value={draft.date} onChange={(ev) => setDraft((d) => ({ ...d, date: ev.target.value }))} />
                <Button size="icon-sm" onClick={() => save(e.id)} aria-label="Zapisz datę">
                  <Check />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Anuluj">
                  <X />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="group flex items-center gap-1.5 font-mono text-xs text-amber-300"
                onClick={() => {
                  setDraft({ year: e.year ? String(e.year) : "", date: e.event_date ?? "" });
                  setEditing(e.id);
                }}
                aria-label={`Zmień datę: ${e.title}`}
              >
                <CalendarDays className="size-3" />
                {e.event_date ?? year ?? "bez daty"}
                <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Link href={`/admin/events/${e.id}`} className="text-sm font-medium hover:underline">
                {e.title}
              </Link>
              <StatusBadge status={e.status} />
              <ConfidenceBadge confidence={e.confidence} />
            </div>
            {e.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}
