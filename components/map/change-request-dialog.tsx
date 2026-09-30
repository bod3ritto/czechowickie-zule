"use client";

import { useState } from "react";
import { CheckCircle2, PencilLine, UserX } from "lucide-react";
import type { PersonId, RelationshipId } from "@/types/domain";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitChangeRequest } from "@/lib/actions/submissions";
import { cn } from "@/lib/format";
import { useMap } from "./map-context";
import { Field, FormFooter, Signature, fieldClass, inputClass, usePeopleOptions, useSubmit } from "./submit-dialog";

export type ChangeRequestKind = "correction" | "removal";

export interface ChangeRequestTarget {
  kind: ChangeRequestKind;
  person?: PersonId;
  relationship?: RelationshipId;
}

interface ChangeRequestDialogProps {
  open: boolean;
  target: ChangeRequestTarget;
  onClose(): void;
}

export function ChangeRequestDialog({ open, target, onClose }: ChangeRequestDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Zgłoś zmianę">
      {open && <ChangeRequestBody target={target} onClose={onClose} />}
    </Dialog>
  );
}

function ChangeRequestBody({ target, onClose }: { target: ChangeRequestTarget; onClose(): void }) {
  const { index } = useMap();
  const people = usePeopleOptions();
  const relationship = target.relationship ? index.relationships.get(target.relationship) : undefined;
  const relationshipLabel = relationship
    ? `${index.people.get(relationship.personA)?.name ?? "?"} ↔ ${index.people.get(relationship.personB)?.name ?? "?"}`
    : null;

  // Removal is only for people (removing a relationship = a correction).
  const [kind, setKind] = useState<ChangeRequestKind>(relationship ? "correction" : target.kind);
  const [person, setPerson] = useState<string>(target.person ?? "");
  const [done, setDone] = useState<string | null>(null);
  const { pending, errors, error, submit, clearError } = useSubmit(setDone);

  if (done) {
    return (
      <div className="grid justify-items-center gap-3 p-6 text-center">
        <CheckCircle2 className="size-8 text-emerald-400" />
        <p className="text-sm text-fg">{done}</p>
        <p className="text-xs text-fg-subtle">Administrator sprawdzi ją najszybciej, jak to możliwe.</p>
        <Button variant="solid" className="mt-2" onClick={onClose}>
          Zamknij
        </Button>
      </div>
    );
  }

  const removal = kind === "removal";

  return (
    <div className="min-h-0 overflow-y-auto p-4">
      {!relationship && (
        <div role="tablist" aria-label="Rodzaj zgłoszenia" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-white/[0.04] p-1">
          <KindTab active={!removal} onClick={() => setKind("correction")} icon={<PencilLine className="size-4" />}>
            Poprawka
          </KindTab>
          <KindTab active={removal} onClick={() => setKind("removal")} icon={<UserX className="size-4" />}>
            Usuń mnie z mapy
          </KindTab>
        </div>
      )}

      <p className="mb-4 text-xs leading-relaxed text-fg-subtle">
        {removal
          ? "Jeśli jesteś na mapie i nie chcesz tu być, wyślij prośbę — administrator usunie Cię razem z Twoimi relacjami. Nie musisz podawać powodu."
          : "Coś się nie zgadza? Napisz, co poprawić. Zgłoszenie trafia tylko do administratora, nic na mapie nie zmienia się automatycznie."}
      </p>

      <form
        noValidate
        onInput={clearError}
        onChange={clearError}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const get = (k: string) => String(f.get(k) ?? "");
          submit(() =>
            submitChangeRequest({
              kind,
              person: relationship ? null : person || null,
              relationship: relationship ? relationship.id : null,
              message: get("message"),
              contact: get("contact"),
              submittedBy: get("submittedBy"),
              website: get("website"),
            }),
          );
        }}
        className="grid gap-3"
      >
        {relationship ? (
          <div className="grid gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Relacja</span>
            <p className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg">{relationshipLabel}</p>
          </div>
        ) : (
          <Field label={removal ? "Kogo usunąć? *" : "Kogo dotyczy? *"} error={errors.person}>
            {(p) => (
              <select {...p} name="person" value={person} onChange={(e) => setPerson(e.target.value)} className={inputClass} data-autofocus={!person ? true : undefined}>
                <option value="" disabled>
                  Wybierz osobę…
                </option>
                {people.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field label={removal ? "Dodatkowe informacje (opcjonalnie)" : "Co trzeba poprawić? *"} error={errors.message}>
          {(p) => (
            <textarea
              {...p}
              name="message"
              rows={4}
              maxLength={1000}
              placeholder={removal ? "" : "np. ksywka jest inna, ta historia się nie wydarzyła, ta relacja nie istnieje…"}
              className={cn(fieldClass, "py-2")}
              data-autofocus={person || relationship ? true : undefined}
            />
          )}
        </Field>
        <Field label="Kontakt (opcjonalnie, jeśli chcesz odpowiedź; widzi go tylko admin)" error={errors.contact}>
          {(p) => <input {...p} name="contact" maxLength={200} placeholder="e-mail, telefon albo Messenger" className={inputClass} />}
        </Field>
        <Signature error={errors.submittedBy} />
        <FormFooter pending={pending} error={error} label={removal ? "Wyślij prośbę o usunięcie" : "Wyślij zgłoszenie"} />
      </form>
    </div>
  );
}

function KindTab({ active, onClick, icon, children }: { active: boolean; onClick(): void; icon: React.ReactNode; children: React.ReactNode }) {
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
