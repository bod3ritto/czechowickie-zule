"use client";

import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { CheckCircle2, Link2, UserPlus } from "lucide-react";
import type { PersonId } from "@/types/domain";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitPerson, submitRelationship } from "@/lib/actions/submissions";
import type { FieldErrors } from "@/lib/actions/result";
import { PERSON_CATEGORY_VALUES, RELATIONSHIP_TYPE_VALUES } from "@/lib/db/enums";
import { PERSON_CATEGORIES, RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { cn } from "@/lib/format";
import { useMap } from "./map-context";

export type SubmitKind = "person" | "relationship";

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

const fieldClass =
  "w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-brand aria-[invalid=true]:border-red-400/70";
const inputClass = cn(fieldClass, "h-10");

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
      <div role="tablist" aria-label="Co chcesz dodać?" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-white/[0.04] p-1">
        <Tab active={kind === "person"} onClick={() => setKind("person")} icon={<UserPlus className="size-4" />}>
          Osobę
        </Tab>
        <Tab active={kind === "relationship"} onClick={() => setKind("relationship")} icon={<Link2 className="size-4" />}>
          Relację
        </Tab>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-fg-subtle">
        Każde zgłoszenie sprawdza administrator, zanim pojawi się na mapie. Dodawaj tylko osoby, które nie mają nic przeciwko, i bez
        danych wrażliwych (nazwiska, adresy, zdrowie).
      </p>
      {kind === "person" ? (
        <PersonForm relatedTo={personId} onDone={setDone} />
      ) : (
        <RelationshipForm personA={personId} onDone={setDone} />
      )}
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

function usePeopleOptions() {
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
function useSubmit(onDone: (message: string) => void) {
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
    if (name && errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
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

function Signature({ error }: { error?: string }) {
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

function FormFooter({ pending, error }: { pending: boolean; error: string | null }) {
  return (
    <div className="mt-1 grid gap-2">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button type="submit" variant="solid" disabled={pending} className="w-full">
        {pending ? "Wysyłanie…" : "Wyślij do zatwierdzenia"}
      </Button>
    </div>
  );
}

function Field({
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
