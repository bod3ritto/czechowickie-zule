"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Person } from "@/types/domain";
import { searchPeople } from "@/lib/search";
import { countLabel } from "@/lib/format";
import { personPath } from "@/lib/site";
import { PERSON_CATEGORIES } from "@/lib/relationship-types";
import { PersonAvatar } from "./person-avatar";

export interface DirectoryEntry {
  person: Person;
  degree: number;
  events: number;
}

export function PeopleDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    if (!query.trim()) return entries;
    const ids = new Set(searchPeople(entries.map((e) => e.person), query, entries.length).map((p) => p.id));
    return entries.filter((e) => ids.has(e.person.id));
  }, [entries, query]);

  return (
    <>
      <label className="mt-8 flex h-11 max-w-md items-center gap-3 rounded-lg border border-line bg-surface px-3 focus-within:border-line-strong">
        <Search className="size-4 text-fg-subtle" aria-hidden="true" />
        <span className="sr-only">Filtruj osoby</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtruj po imieniu lub ksywce…"
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle"
        />
      </label>
      <p className="mt-3 font-mono text-[11px] text-fg-subtle" aria-live="polite">
        {countLabel(shown.length, "osoba", "osoby", "osób")}
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ person, degree, events }) => (
          <li key={person.id}>
            <Link
              href={personPath(person.id)}
              className="group flex h-full gap-3 rounded-xl border border-line bg-surface/60 p-4 transition-colors hover:border-line-strong hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
            >
              <PersonAvatar person={person} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="font-medium text-fg">{person.name}</span>
                  {person.nickname && person.nickname !== person.name && (
                    <span className="truncate font-mono text-xs text-fg-subtle">„{person.nickname}”</span>
                  )}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{person.bio}</p>
                <p className="mt-2 flex items-center gap-2 font-mono text-[10px] text-fg-subtle">
                  <span className="size-1.5 rounded-full" style={{ background: PERSON_CATEGORIES[person.category].color }} aria-hidden="true" />
                  {PERSON_CATEGORIES[person.category].label} · {countLabel(degree, "relacja", "relacje", "relacji")} · {countLabel(events, "wydarzenie", "wydarzenia", "wydarzeń")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
