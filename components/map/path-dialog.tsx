"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDownUp, MapPinned } from "lucide-react";
import type { PersonId } from "@/types/domain";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/person/person-avatar";
import { commonNeighbors, shortestPath } from "@/lib/graph/algorithms";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { countLabel } from "@/lib/format";
import { useMap } from "./map-context";

interface PathDialogProps {
  open: boolean;
  initialFrom?: PersonId;
  initialTo?: PersonId;
  onClose(): void;
}

export function PathDialog({ open, initialFrom, initialTo, onClose }: PathDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Ścieżka znajomości">
      {open && <PathBody initialFrom={initialFrom} initialTo={initialTo} onClose={onClose} />}
    </Dialog>
  );
}

function PathBody({ initialFrom, initialTo, onClose }: Omit<PathDialogProps, "open">) {
  const { index, showPath } = useMap();
  const people = useMemo(
    () => [...index.dataset.people].sort((a, b) => a.name.localeCompare(b.name, "pl")),
    [index],
  );
  const [from, setFrom] = useState<PersonId>(initialFrom ?? people[0]?.id ?? "");
  const [to, setTo] = useState<PersonId>(initialTo ?? people.find((p) => p.id !== (initialFrom ?? people[0]?.id))?.id ?? "");
  const fromId = useId();
  const toId = useId();

  const steps = useMemo(() => (from && to ? shortestPath(index, from, to) : null), [index, from, to]);
  const common = useMemo(() => (from && to && from !== to ? commonNeighbors(index, from, to) : []), [index, from, to]);

  const selectClass =
    "h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <div className="min-h-0 overflow-y-auto p-4">
      <p className="mb-4 text-sm text-fg-muted">Wybierz dwie osoby, a mapa znajdzie najkrótszy łańcuch znajomości między nimi.</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <label htmlFor={fromId} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Od</label>
          <select id={fromId} value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.nickname && p.nickname !== p.name ? ` „${p.nickname}”` : ""}</option>
            ))}
          </select>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Zamień osoby"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <ArrowDownUp className="size-4 rotate-90" />
        </Button>
        <div>
          <label htmlFor={toId} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Do</label>
          <select id={toId} value={to} onChange={(e) => setTo(e.target.value)} className={selectClass}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.nickname && p.nickname !== p.name ? ` „${p.nickname}”` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5" aria-live="polite">
        {from === to ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-subtle">To ta sama osoba. Zna samego siebie od zawsze.</p>
        ) : !steps ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-subtle">Brak połączenia. Te osoby żyją w równoległych Czechowicach.</p>
        ) : (
          <>
            <p className="mb-3 font-mono text-[11px] text-fg-subtle">
              {countLabel(steps.length - 1, "krok", "kroki", "kroków")} · {countLabel(common.length, "wspólny znajomy", "wspólnych znajomych", "wspólnych znajomych")}
            </p>
            <ol className="relative space-y-0">
              {steps.map((step, i) => {
                const person = index.people.get(step.personId)!;
                const meta = step.via ? RELATIONSHIP_TYPES[step.via.type] : null;
                return (
                  <li key={step.personId}>
                    {meta && step.via && (
                      <div className="ml-[15px] flex items-center gap-3 border-l border-dashed py-2 pl-5" style={{ borderColor: meta.color }}>
                        <span className="font-mono text-[11px]" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="truncate text-xs text-fg-subtle">{step.via.description}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <PersonAvatar person={person} size="sm" />
                      <span className="text-sm font-medium text-fg">{person.name}</span>
                      {i === 0 && <span className="font-mono text-[10px] text-fg-subtle">start</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {common.length > 0 && (
              <div className="mt-5 rounded-lg border border-line p-3">
                <p className="mb-2 text-xs text-fg-muted">Wspólni znajomi</p>
                <ul className="flex flex-wrap gap-1.5">
                  {common.map((id) => {
                    const p = index.people.get(id)!;
                    return (
                      <li key={id} className="flex items-center gap-1.5 rounded-md bg-white/[0.04] py-1 pl-1 pr-2 text-xs text-fg">
                        <PersonAvatar person={p} size="xs" />
                        {p.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Button
              variant="solid"
              className="mt-5 w-full"
              onClick={() => {
                showPath({ from, to, steps });
                onClose();
              }}
            >
              <MapPinned className="size-4" />
              Pokaż na mapie
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
