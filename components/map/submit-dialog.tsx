"use client";

import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Link2, UserPlus, X } from "lucide-react";
import type { PersonId } from "@/types/domain";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitEvent, submitLore, submitPerson, submitRelationship } from "@/lib/actions/submissions";
import type { FieldErrors } from "@/lib/actions/result";
import { LORE_TYPE_VALUES, PERSON_CATEGORY_VALUES, RELATIONSHIP_TYPE_VALUES } from "@/lib/db/enums";
import { LORE_TYPE_LABEL, PERSON_CATEGORIES, RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { cn } from "@/lib/format";
import { useMap } from "./map-context";

export type SubmitKind = "person" | "relationship" | "lore" | "event";

interface SubmitDialogProps {
  open: boolean;
  kind: SubmitKind;
  /** Pre-selected person (e.g. opened from a person's panel). */
  personId?: PersonId;
  onClose(): void;
}

export function SubmitDialog({ open, kind, personId, onClose }: SubmitDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Dodaj na mapę">
      {open && <SubmitBody initialKind={kind} personId={personId} onClose={onClose} />}
    </Dialog>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-brand aria-[invalid=true]:border-red-400/70";
export const inputClass = cn(fieldClass, "h-10");

function SubmitBody({ initialKind, personId, onClose }: { initialKind: SubmitKind; personId?: PersonId; onClose(): void }) {
  const [kind, setKind] = useState<SubmitKind>(initialKind);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="grid justify-items-center gap-3 p-6 text-center">
        <CheckCircle2 className="size-8 text-emerald-400" />
        <p className="text-sm text-fg">{done}</p>
        <p className="text-xs text-fg-subtle">Po zatwierdzeniu wpis pojawi się na mapie.</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => setDone(null)}>Dodaj kolejne</Button>
          <Button variant="solid" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 overflow-y-auto p-4">
      <div role="tablist" aria-label="Co chcesz dodać?" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-white/[0.04] p-1 sm:grid-cols-4">
        <Tab active={kind === "person"} onClick={() => setKind("person")} icon={<UserPlus className="size-4" />}>
          Osobę
        </Tab>
        <Tab active={kind === "relationship"} onClick={() => setKind("relationship")} icon={<Link2 className="size-4" />}>
          Relację
        </Tab>
        <Tab active={kind === "lore"} onClick={() => setKind("lore")} icon={<BookOpen className="size-4" />}>
          Lore
        </Tab>
        <Tab active={kind === "event"} onClick={() => setKind("event")} icon={<CalendarDays className="size-4" />}>
          Wydarzenie
        </Tab>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-fg-subtle">
        Każde zgłoszenie sprawdza administrator, zanim pojawi się na mapie. Dodawaj tylko osoby, które nie mają nic przeciwko, i bez
        danych wrażliwych (nazwiska, adresy, zdrowie).
      </p>
      {kind === "person" && <PersonForm relatedTo={personId} onDone={setDone} />}
      {kind === "relationship" && <RelationshipForm personA={personId} onDone={setDone} />}
      {kind === "lore" && <LoreForm initialPeople={personId ? [personId] : []} onDone={setDone} />}
      {kind === "event" && <EventForm initialPeople={personId ? [personId] : []} onDone={setDone} />}
    </div>
  );
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick(): void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center justify-center gap-2 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
        active ? "bg-surface text-fg shadow" : "text-fg-muted hover:text-fg",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function usePeopleOptions() {
  const { index } = useMap();
  return useMemo(
    () =>
      [...index.dataset.people]
        .sort((a, b) => a.name.localeCompare(b.name, "pl"))
        .map((p) => ({ id: p.id, label: p.nickname && p.nickname !== p.name ? `${p.name} „${p.nickname}”` : p.name })),
    [index],
  );
}

/** Shared submit plumbing: pending state, field errors, general error. */
export function useSubmit(onDone: (message: string) => void) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const submit = (action: () => ReturnType<typeof submitPerson>) =>
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (result.ok) {
          setErrors({});
          onDone(result.message ?? "Dzięki! Zgłoszenie czeka na zatwierdzenie.");
        } else {
          setErrors(result.fieldErrors ?? {});
          setError(result.error);
        }
      } catch {
        setError("Brak połączenia z serwerem. Spróbuj ponownie.");
      }
    });
  /** Hide a field's error as soon as the visitor edits that field. */
  const clearError = (e: React.FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name;
    if (!name || !errors[name]) return;
    setErrors(({ [name]: _removed, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
    setError(null);
  };
  return { pending, errors, error, submit, clearError };
}

function PersonForm({ relatedTo: initialRelated, onDone }: { relatedTo?: PersonId; onDone(message: string): void }) {
  const people = usePeopleOptions();
  const [relatedTo, setRelatedTo] = useState<string>(initialRelated ?? "");
  const { pending, errors, error, submit, clearError } = useSubmit(onDone);

  return (
    <form
      noValidate
      onInput={clearError}
      onChange={clearError}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        submit(() =>
          submitPerson({
            firstName: get("firstName"),
            nickname: get("nickname"),
            bio: get("bio"),
            category: get("category") as (typeof PERSON_CATEGORY_VALUES)[number],
            relatedTo: relatedTo || null,
            relatedType: relatedTo ? ((get("relatedType") || null) as (typeof RELATIONSHIP_TYPE_VALUES)[number] | null) : null,
            relatedDescription: get("relatedDescription"),
            submittedBy: get("submittedBy"),
            website: get("website"),
          }),
        );
      }}
      className="grid gap-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Imię *" error={errors.firstName}>
          {(p) => <input {...p} name="firstName" maxLength={80} className={inputClass} data-autofocus required />}
        </Field>
        <Field label="Ksywka" error={errors.nickname}>
          {(p) => <input {...p} name="nickname" maxLength={80} className={inputClass} />}
        </Field>
      </div>
      <Field label="Kategoria" error={errors.category}>
        {(p) => (
          <select {...p} name="category" defaultValue="bywalec" className={inputClass}>
            {PERSON_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {PERSON_CATEGORIES[c].label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Kilka słów o tej osobie" error={errors.bio}>
        {(p) => <textarea {...p} name="bio" rows={3} maxLength={1000} className={cn(fieldClass, "py-2")} />}
      </Field>

      <fieldset className="grid gap-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-xs text-fg-muted">Kogo zna z mapy? (opcjonalnie)</legend>
        <Field label="Osoba" error={errors.relatedTo}>
          {(p) => (
            <select {...p} value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)} className={inputClass}>
              <option value="">— nikogo nie wybieram —</option>
              {people.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        {relatedTo && (
          <>
            <Field label="Skąd się znają? *" error={errors.relatedType}>
              {(p) => <RelationshipTypeSelect {...p} name="relatedType" />}
            </Field>
            <Field label="Opis znajomości" error={errors.relatedDescription}>
              {(p) => <input {...p} name="relatedDescription" maxLength={500} className={inputClass} />}
            </Field>
          </>
        )}
      </fieldset>

      <Signature error={errors.submittedBy} />
      <FormFooter pending={pending} error={error} />
    </form>
  );
}

function RelationshipForm({ personA, onDone }: { personA?: PersonId; onDone(message: string): void }) {
  const people = usePeopleOptions();
  const { pending, errors, error, submit, clearError } = useSubmit(onDone);

  return (
    <form
      noValidate
      onInput={clearError}
      onChange={clearError}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        submit(() =>
          submitRelationship({
            personA: get("personA"),
            personB: get("personB"),
            type: get("type") as (typeof RELATIONSHIP_TYPE_VALUES)[number],
            description: get("description"),
            sinceYear: get("sinceYear"),
            submittedBy: get("submittedBy"),
            website: get("website"),
          }),
        );
      }}
      className="grid gap-3"
    >
      <div className="grid grid-cols-2 gap-3">
        {(["personA", "personB"] as const).map((key, i) => (
          <Field key={key} label={i === 0 ? "Osoba A *" : "Osoba B *"} error={errors[key]}>
            {(p) => (
              <select {...p} name={key} defaultValue={i === 0 ? (personA ?? "") : ""} className={inputClass} data-autofocus={i === 0 && !personA ? true : undefined}>
                <option value="" disabled>
                  Wybierz…
                </option>
                {people.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Skąd się znają? *" error={errors.type}>
          {(p) => <RelationshipTypeSelect {...p} name="type" />}
        </Field>
        <Field label="Od roku" error={errors.sinceYear}>
          {(p) => <input {...p} name="sinceYear" inputMode="numeric" placeholder="np. 2015" maxLength={4} className={inputClass} />}
        </Field>
      </div>
      <Field label="Opis" error={errors.description}>
        {(p) => <textarea {...p} name="description" rows={3} maxLength={500} className={cn(fieldClass, "py-2")} />}
      </Field>
      <Signature error={errors.submittedBy} />
      <FormFooter pending={pending} error={error} />
    </form>
  );
}

function LoreForm({ initialPeople, onDone }: { initialPeople: PersonId[]; onDone(message: string): void }) {
  const [people, setPeople] = useState<string[]>(initialPeople);
  const { pending, errors, error, submit, clearError } = useSubmit(onDone);
  return (
    <form
      noValidate
      onInput={clearError}
      onChange={clearError}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        submit(() =>
          submitLore({
            title: get("title"),
            content: get("content"),
            loreType: get("loreType") as (typeof LORE_TYPE_VALUES)[number],
            year: get("year"),
            people,
            submittedBy: get("submittedBy"),
            website: get("website"),
          }),
        );
      }}
      className="grid gap-3"
    >
      <Field label="Historia, cytat, plotka… *" error={errors.content}>
        {(p) => <textarea {...p} name="content" rows={4} maxLength={2000} className={cn(fieldClass, "py-2")} data-autofocus />}
      </Field>
      <div className="grid grid-cols-[1fr_160px_100px] gap-3 max-sm:grid-cols-2">
        <Field label="Tytuł (opcjonalnie)" error={errors.title}>
          {(p) => <input {...p} name="title" maxLength={160} className={inputClass} />}
        </Field>
        <Field label="Rodzaj" error={errors.loreType}>
          {(p) => (
            <select {...p} name="loreType" defaultValue="ciekawostka" className={inputClass}>
              {LORE_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {LORE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Rok" error={errors.year}>
          {(p) => <input {...p} name="year" inputMode="numeric" placeholder="np. 2016" maxLength={4} className={inputClass} />}
        </Field>
      </div>
      <PeoplePicker label="Kogo dotyczy?" value={people} onChange={setPeople} error={errors.people} />
      <Signature error={errors.submittedBy} />
      <FormFooter pending={pending} error={error} />
    </form>
  );
}

function EventForm({ initialPeople, onDone }: { initialPeople: PersonId[]; onDone(message: string): void }) {
  const [people, setPeople] = useState<string[]>(initialPeople);
  const { pending, errors, error, submit, clearError } = useSubmit(onDone);
  return (
    <form
      noValidate
      onInput={clearError}
      onChange={clearError}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        submit(() =>
          submitEvent({
            title: get("title"),
            description: get("description"),
            year: get("year"),
            people,
            submittedBy: get("submittedBy"),
            website: get("website"),
          }),
        );
      }}
      className="grid gap-3"
    >
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Co się wydarzyło? *" error={errors.title}>
          {(p) => <input {...p} name="title" maxLength={200} placeholder="np. Legendarny grill nad Wisłą" className={inputClass} data-autofocus />}
        </Field>
        <Field label="Rok" error={errors.year}>
          {(p) => <input {...p} name="year" inputMode="numeric" placeholder="np. 2019" maxLength={4} className={inputClass} />}
        </Field>
      </div>
      <Field label="Opis" error={errors.description}>
        {(p) => <textarea {...p} name="description" rows={3} maxLength={2000} className={cn(fieldClass, "py-2")} />}
      </Field>
      <PeoplePicker label="Kto brał udział?" value={people} onChange={setPeople} error={errors.people} />
      <Signature error={errors.submittedBy} />
      <FormFooter pending={pending} error={error} />
    </form>
  );
}

/** Several people from the map: pick from a list, remove with ×. */
function PeoplePicker({ label, value, onChange, error }: { label: string; value: string[]; onChange(next: string[]): void; error?: string }) {
  const options = usePeopleOptions();
  const byId = new Map(options.map((o) => [o.id, o.label]));
  return (
    <Field label={`${label} (opcjonalnie)`} error={error}>
      {(p) => (
        <div className="grid gap-2">
          <select
            {...p}
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id && !value.includes(id) && value.length < 20) onChange([...value, id]);
            }}
            className={inputClass}
          >
            <option value="">{value.length ? "Dodaj kolejną osobę…" : "Wybierz osobę…"}</option>
            {options
              .filter((o) => !value.includes(o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
          </select>
          {value.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Wybrane osoby">
              {value.map((id) => (
                <li key={id} className="flex items-center gap-1 rounded-md bg-white/[0.06] py-1 pl-2 pr-1 text-xs text-fg">
                  {byId.get(id) ?? id}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((v) => v !== id))}
                    aria-label={`Usuń ${byId.get(id) ?? id}`}
                    className="rounded p-0.5 text-fg-muted hover:bg-white/10 hover:text-fg"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}

function RelationshipTypeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} defaultValue="" className={inputClass}>
      <option value="" disabled>
        Wybierz…
      </option>
      {RELATIONSHIP_TYPE_VALUES.map((t) => (
        <option key={t} value={t}>
          {RELATIONSHIP_TYPES[t].label}
        </option>
      ))}
    </select>
  );
}

export function Signature({ error }: { error?: string }) {
  return (
    <>
      <Field label="Twój podpis (opcjonalnie, widzi go tylko admin)" error={error}>
        {(p) => <input {...p} name="submittedBy" maxLength={80} placeholder="np. ksywka" className={inputClass} />}
      </Field>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Strona www
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}

export function FormFooter({ pending, error, label = "Wyślij do zatwierdzenia" }: { pending: boolean; error: string | null; label?: string }) {
  return (
    <div className="mt-1 grid gap-2">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button type="submit" variant="solid" disabled={pending} className="w-full">
        {pending ? "Wysyłanie…" : label}
      </Button>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
