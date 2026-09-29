"use client";

import { useId, useMemo, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { PersonAvatar } from "@/components/person/person-avatar";
import { searchPeople } from "@/lib/search";
import { cn, countLabel } from "@/lib/format";
import { useMap } from "./map-context";

export function SearchDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Szukaj osoby" hideTitle className="self-start mt-[12vh]">
      {open && <SearchBody onClose={onClose} />}
    </Dialog>
  );
}

function SearchBody({ onClose }: { onClose(): void }) {
  const { index, selectPerson } = useMap();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const results = useMemo(() => {
    if (query.trim()) return searchPeople(index.dataset.people, query, 8);
    return [...index.dataset.people].sort((a, b) => a.name.localeCompare(b.name, "pl")).slice(0, 8);
  }, [index, query]);

  const choose = (id: string) => {
    onClose();
    selectPerson(id);
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <input
          data-autofocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              choose(results[active].id);
            }
          }}
          placeholder="Imię albo ksywka, np. „krz”…"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-autocomplete="list"
          aria-label="Szukaj osoby"
          className="h-14 w-full bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>

      <ul id={listId} role="listbox" aria-label="Wyniki" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-fg-subtle">Nikogo takiego nie ma na mapie. Jeszcze.</li>
        )}
        {results.map((person, i) => {
          const degree = index.adjacency.get(person.id)?.length ?? 0;
          return (
            <li
              key={person.id}
              id={`${listId}-${person.id}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(person.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
                i === active ? "bg-white/[0.07]" : "",
              )}
            >
              <PersonAvatar person={person} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{person.name}</span>
                {person.nickname && person.nickname !== person.name && (
                  <span className="block truncate font-mono text-[11px] text-fg-subtle">„{person.nickname}”</span>
                )}
              </span>
              <span className="font-mono text-[11px] text-fg-subtle">{countLabel(degree, "relacja", "relacje", "relacji")}</span>
              {i === active && <CornerDownLeft className="size-3.5 text-fg-subtle" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>

      <footer className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] text-fg-subtle">
        <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> wybierz</span>
        <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> pokaż na mapie</span>
        <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> zamknij</span>
      </footer>
    </div>
  );
}
