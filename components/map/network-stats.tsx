"use client";

import { useMemo, useState } from "react";
import { ChevronUp } from "lucide-react";
import { networkStats } from "@/lib/graph/stats";
import { cn } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { useMap } from "./map-context";

function StatsBody() {
  const { index, selectPerson, selectRelationship } = useMap();
  const stats = useMemo(() => networkStats(index), [index]);
  const oldestA = stats.oldest && index.people.get(stats.oldest.personA);
  const oldestB = stats.oldest && index.people.get(stats.oldest.personB);

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Osoby", stats.people],
          ["Relacje", stats.relationships],
          ["Wydarzenia", stats.events],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
            <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="space-y-2 text-[13px]">
        {stats.mostConnected && (
          <Row label="Najbardziej połączona osoba">
            <button type="button" className="link" onClick={() => selectPerson(stats.mostConnected!.person.id)}>
              {stats.mostConnected.person.name}
            </button>
            <span className="text-fg-subtle"> · {stats.mostConnected.degree}</span>
          </Row>
        )}
        {stats.oldest && oldestA && oldestB && (
          <Row label="Najstarsza znana relacja">
            <button type="button" className="link" onClick={() => selectRelationship(stats.oldest!.id)}>
              {oldestA.name} & {oldestB.name}
            </button>
            <span className="text-fg-subtle"> · {stats.oldest.since}</span>
          </Row>
        )}
        {stats.topType && (
          <Row label="Najczęstszy typ znajomości">
            {stats.topType.label}
            <span className="text-fg-subtle"> · {stats.topType.count}</span>
          </Row>
        )}
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  );
}

/** Collapsible desktop widget. */
export function NetworkStatsCard({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { index } = useMap();
  return (
    <section aria-label="Sieć w liczbach" className={cn("w-[300px] rounded-xl border border-line bg-surface/85 shadow-xl backdrop-blur", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-brand"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Sieć w liczbach</span>
        <span className="flex items-center gap-2 font-mono text-[11px] text-fg-muted">
          {!open && `${index.dataset.people.length} os. · ${index.dataset.relationships.length} rel.`}
          <ChevronUp className={cn("size-3.5 transition-transform", !open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="animate-fade-in px-3.5 pb-3.5">
          <StatsBody />
        </div>
      )}
    </section>
  );
}

export function NetworkStatsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Sieć w liczbach">
      <div className="p-4" onClick={(e) => (e.target as HTMLElement).closest("button.link") && onClose()}>
        <StatsBody />
      </div>
    </Dialog>
  );
}
