"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Field } from "@/components/admin/common/layout";
import { MultiPersonPicker } from "@/components/admin/common/person-picker";
import { CONFIDENCE_OPTIONS, LocationSelect, OptionSelect, SOURCE_OPTIONS, StatusSegment } from "@/components/admin/common/inputs";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useUnsavedChanges } from "@/components/admin/providers/unsaved-changes";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { saveEvent } from "@/lib/actions/events";
import { eventSchema, type EventInput, type EventValues } from "@/lib/validations/entities";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import type { EventRow } from "@/lib/db/database.types";
import type { Status } from "@/lib/db/enums";

type EventWithLinks = EventRow & { people: string[]; relationships: string[] };

function toInput(row?: EventWithLinks, prefillPeople: string[] = []): EventInput {
  return {
    id: row?.id,
    title: row?.title ?? "",
    description: row?.description ?? "",
    eventDate: row?.event_date ?? "",
    year: row?.year ? String(row.year) : "",
    month: row?.month ? String(row.month) : "",
    people: row?.people ?? prefillPeople,
    relationships: row?.relationships ?? [],
    locationId: row?.location_id ?? "",
    confidence: row?.confidence ?? "confirmed",
    sourceType: row?.source_type ?? "personal",
    sourceNote: row?.source_note ?? "",
    status: row?.status ?? "draft",
  };
}

export function EventForm({
  event,
  prefillPeople,
  compact,
  onSaved,
}: {
  event?: EventWithLinks;
  prefillPeople?: string[];
  compact?: boolean;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const { network, peopleById } = useAdminData();
  const { run, pending } = useServerAction();
  const form = useForm<EventInput, unknown, EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: toInput(event, prefillPeople),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, getValues, setError, formState, reset } = form;
  const errors = formState.errors;
  useUnsavedChanges(`event-${event?.id ?? "new"}`, formState.isDirty && !pending);
  const [people, status] = useWatch({ control, name: ["people", "status"] });

  // Relationships between the selected participants are offered as links.
  const candidateRelationships = useMemo(() => {
    const set = new Set(people);
    return network.relationships.filter((r) => set.has(r.personA) && set.has(r.personB));
  }, [network.relationships, people]);

  const submit = (publish: boolean) =>
    handleSubmit(async () => {
      const values = getValues();
      const nextStatus: Status = publish ? "published" : (values.status as Status);
      const allowed = new Set(candidateRelationships.map((r) => r.id));
      const result = await run(
        () => saveEvent({ ...values, relationships: values.relationships.filter((id) => allowed.has(id)), status: nextStatus }),
        {
          onError: (r) => {
            for (const [field, message] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof EventInput, { message });
          },
        },
      );
      if (!result.ok) return;
      reset({ ...values, status: nextStatus });
      if (onSaved) onSaved(result.data.id);
      else if (!event) router.push(`/admin/events/${result.data.id}`);
    })();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      className="grid gap-5"
      noValidate
    >
      <Field label="Tytuł" htmlFor="title" required error={errors.title?.message}>
        <Input id="title" autoFocus={!event} placeholder="np. Legendarny grill" aria-invalid={Boolean(errors.title)} {...register("title")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Data" htmlFor="eventDate" hint="Jeśli znasz dokładny dzień." error={errors.eventDate?.message}>
          <Input id="eventDate" type="date" {...register("eventDate")} />
        </Field>
        <Field label="Rok" htmlFor="year" hint="Wystarczy sam rok." error={errors.year?.message}>
          <Input id="year" inputMode="numeric" maxLength={4} placeholder="np. 2021" {...register("year")} />
        </Field>
        {!compact && (
          <Field label="Miesiąc" htmlFor="month" error={errors.month?.message}>
            <Input id="month" inputMode="numeric" maxLength={2} placeholder="1–12" {...register("month")} />
          </Field>
        )}
      </div>

      <Field label="Opis" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={3} placeholder="np. Wieczór, o którym do dziś krążą różne wersje historii." {...register("description")} />
      </Field>

      <Field label="Osoby uczestniczące">
        <Controller control={control} name="people" render={({ field }) => <MultiPersonPicker value={field.value} onChange={field.onChange} />} />
      </Field>

      {candidateRelationships.length > 0 && (
        <Field label="Relacje (Jak się poznali?)" hint="Wydarzenie pojawi się w historii zaznaczonych relacji.">
          <Controller
            control={control}
            name="relationships"
            render={({ field }) => (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {candidateRelationships.map((r) => {
                  const checked = field.value.includes(r.id);
                  return (
                    <li key={r.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => field.onChange(checked ? field.value.filter((v) => v !== r.id) : [...field.value, r.id])}
                        />
                        <span className="truncate">
                          {peopleById.get(r.personA)?.name} ↔ {peopleById.get(r.personB)?.name}
                        </span>
                        <span className="ml-auto text-[11px]" style={{ color: RELATIONSHIP_TYPES[r.type].color }}>
                          {RELATIONSHIP_TYPES[r.type].label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Lokalizacja" htmlFor="locationId">
          <Controller control={control} name="locationId" render={({ field }) => <LocationSelect id="locationId" value={field.value} onChange={field.onChange} />} />
        </Field>
        <Field label="Pewność informacji" htmlFor="confidence">
          <Controller
            control={control}
            name="confidence"
            render={({ field }) => <OptionSelect id="confidence" value={field.value} onChange={field.onChange} options={CONFIDENCE_OPTIONS} />}
          />
        </Field>
        <Field label="Źródło" htmlFor="sourceType">
          <Controller
            control={control}
            name="sourceType"
            render={({ field }) => <OptionSelect id="sourceType" value={field.value} onChange={field.onChange} options={SOURCE_OPTIONS} />}
          />
        </Field>
      </div>
      {!compact && (
        <Field label="Notatka o źródle" htmlFor="sourceNote" hint="Tylko dla admina.">
          <Input id="sourceNote" {...register("sourceNote")} />
        </Field>
      )}

      <Field label="Status">
        <Controller control={control} name="status" render={({ field }) => <StatusSegment value={field.value as Status} onChange={field.onChange} />} />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {formState.isDirty && <span className="mr-auto text-xs text-amber-300">Niezapisane zmiany</span>}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Zapisz
        </Button>
        {status !== "published" && (
          <Button type="button" disabled={pending} onClick={() => void submit(true)}>
            Zapisz i opublikuj
          </Button>
        )}
      </div>
    </form>
  );
}
