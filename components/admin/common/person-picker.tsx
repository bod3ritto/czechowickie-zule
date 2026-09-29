"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/admin/ui/command";
import { Button } from "@/components/admin/ui/button";
import { PersonAvatar } from "@/components/person/person-avatar";
import { normalizeText } from "@/lib/format";
import { personLabel, type NetworkPerson } from "@/lib/admin/network";
import { cn } from "@/lib/utils";
import { useAdminData } from "@/components/admin/providers/admin-data";

export function AdminAvatar({ person, size = "sm" }: { person: NetworkPerson; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <PersonAvatar
      person={{ name: person.name, category: person.category, avatarUrl: person.avatarUrl ?? undefined }}
      size={size}
      className={cn(person.status === "draft" && "border-dashed", person.status === "archived" && "opacity-50")}
    />
  );
}

function matches(person: NetworkPerson, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  return [person.name, person.lastName ?? "", person.nickname ?? "", person.slug, ...person.aliases].some((f) =>
    normalizeText(f).includes(q),
  );
}

function PeopleList({
  query,
  onQuery,
  selected,
  onSelect,
  exclude,
}: {
  query: string;
  onQuery(value: string): void;
  selected: Set<string>;
  onSelect(id: string): void;
  exclude?: string[];
}) {
  const { network } = useAdminData();
  const results = useMemo(() => {
    const excluded = new Set(exclude);
    return network.people.filter((p) => !excluded.has(p.id) && p.status !== "archived" && matches(p, query)).slice(0, 50);
  }, [network.people, query, exclude]);

  return (
    <Command shouldFilter={false}>
      <CommandInput value={query} onValueChange={onQuery} placeholder="Szukaj po imieniu, ksywce, slugu…" />
      <CommandList>
        <CommandEmpty>Nie znaleziono osoby.</CommandEmpty>
        {results.map((p) => (
          <CommandItem key={p.id} value={p.id} onSelect={() => onSelect(p.id)} className="gap-2.5">
            <AdminAvatar person={p} size="xs" />
            <span className="min-w-0 flex-1 truncate">{personLabel(p)}</span>
            {p.status === "draft" && <span className="text-[10px] text-amber-300">szkic</span>}
            {selected.has(p.id) && <Check className="size-4" />}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}

interface PersonPickerProps {
  value: string | null | undefined;
  onChange(id: string): void;
  placeholder?: string;
  exclude?: string[];
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
}

export function PersonPicker({ value, onChange, placeholder = "Wybierz osobę…", exclude, disabled, id, invalid }: PersonPickerProps) {
  const { peopleById } = useAdminData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const person = value ? peopleById.get(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className="w-full justify-between px-2.5 font-normal aria-invalid:border-destructive"
        >
          {person ? (
            <span className="flex min-w-0 items-center gap-2">
              <AdminAvatar person={person} size="xs" />
              <span className="truncate">{personLabel(person)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <PeopleList
          query={query}
          onQuery={setQuery}
          selected={new Set(value ? [value] : [])}
          exclude={exclude}
          onSelect={(personId) => {
            onChange(personId);
            setOpen(false);
            setQuery("");
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function MultiPersonPicker({
  value,
  onChange,
  placeholder = "Dodaj osoby…",
}: {
  value: string[];
  onChange(ids: string[]): void;
  placeholder?: string;
}) {
  const { peopleById } = useAdminData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(value);

  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const p = peopleById.get(id);
            if (!p) return null;
            return (
              <li key={id} className="flex items-center gap-1.5 rounded-md border bg-secondary py-0.5 pl-0.5 pr-1 text-xs">
                <AdminAvatar person={p} size="xs" />
                {personLabel(p)}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  aria-label={`Usuń ${p.name}`}
                >
                  <X className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between px-2.5 font-normal">
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <PeopleList query={query} onQuery={setQuery} selected={selected} onSelect={toggle} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
