"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/admin/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, SOURCE_TYPE_LABEL, SOURCE_TYPE_VALUES, STATUS_VALUES, type Status } from "@/lib/db/enums";
import { CONFIDENCE_LABEL } from "@/lib/relationship-types";
import { CONFIDENCE_VALUES } from "@/lib/db/enums";
import { useAdminData } from "@/components/admin/providers/admin-data";

/** Free-text tags: Enter or comma adds, Backspace removes the last one. */
export function TagsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Dodaj i naciśnij Enter",
  id,
}: {
  value: string[];
  onChange(tags: string[]): void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  const remaining = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="grid gap-2">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-input/30 px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Usuń ${tag}`}>
              <X className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-solid hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Radix Select doesn't allow "" as a value; this maps empty ↔ "none". */
const NONE = "__none__";

export function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  allowEmpty,
  emptyLabel = "— brak —",
  id,
  className,
  invalid,
}: {
  value: T | "" | null | undefined;
  onChange(value: T | ""): void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  id?: string;
  className?: string;
  invalid?: boolean;
}) {
  return (
    <Select value={value ? value : allowEmpty ? NONE : undefined} onValueChange={(v) => onChange(v === NONE ? "" : (v as T))}>
      <SelectTrigger id={id} className={cn("w-full", className)} aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const STATUS_OPTIONS = STATUS_VALUES.map((v) => ({ value: v, label: STATUS_LABEL[v] }));
export const CONFIDENCE_OPTIONS = CONFIDENCE_VALUES.map((v) => ({ value: v, label: CONFIDENCE_LABEL[v] }));
export const SOURCE_OPTIONS = SOURCE_TYPE_VALUES.map((v) => ({ value: v, label: SOURCE_TYPE_LABEL[v] }));

export function LocationSelect({ value, onChange, id }: { value: string | null | undefined; onChange(v: string): void; id?: string }) {
  const { locations } = useAdminData();
  return (
    <OptionSelect
      id={id}
      value={value ?? ""}
      onChange={onChange}
      allowEmpty
      emptyLabel="— bez lokalizacji —"
      placeholder="Wybierz miejsce"
      options={locations.map((l) => ({ value: l.id, label: l.name }))}
    />
  );
}

/** Segmented status switch used in forms. */
export function StatusSegment({ value, onChange }: { value: Status; onChange(v: Status): void }) {
  return (
    <div role="radiogroup" aria-label="Status" className="inline-flex rounded-md border bg-input/30 p-0.5">
      {STATUS_VALUES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            value === s ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s === "draft" ? "Szkic" : s === "published" ? "Opublikowane" : "Archiwum"}
        </button>
      ))}
    </div>
  );
}

/** Year OR exact date ("Rok lub dokładna data"). */
export function YearOrDate({
  year,
  date,
  onYear,
  onDate,
  idPrefix,
}: {
  year: string;
  date: string;
  onYear(v: string): void;
  onDate(v: string): void;
  idPrefix: string;
}) {
  const [mode, setMode] = useState<"year" | "date">(date ? "date" : "year");
  return (
    <div className="flex gap-2">
      <div className="inline-flex shrink-0 rounded-md border bg-input/30 p-0.5 text-xs">
        {(["year", "date"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              if (m === "year") onDate("");
              else onYear("");
            }}
            className={cn("rounded px-2 py-1", mode === m ? "bg-secondary text-foreground" : "text-muted-foreground")}
          >
            {m === "year" ? "Rok" : "Data"}
          </button>
        ))}
      </div>
      {mode === "year" ? (
        <Input id={`${idPrefix}-year`} inputMode="numeric" placeholder="np. 2019" value={year} onChange={(e) => onYear(e.target.value)} maxLength={4} />
      ) : (
        <Input id={`${idPrefix}-date`} type="date" value={date} onChange={(e) => onDate(e.target.value)} />
      )}
    </div>
  );
}
