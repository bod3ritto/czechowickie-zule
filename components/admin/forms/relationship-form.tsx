"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Slider } from "@/components/admin/ui/slider";
import { Field } from "@/components/admin/common/layout";
import { AdminAvatar, PersonPicker } from "@/components/admin/common/person-picker";
import {
  CONFIDENCE_OPTIONS,
  LocationSelect,
  OptionSelect,
  SOURCE_OPTIONS,
  StatusSegment,
  YearOrDate,
} from "@/components/admin/common/inputs";
import { strengthLabel } from "@/components/admin/common/badges";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useUnsavedChanges } from "@/components/admin/providers/unsaved-changes";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { saveRelationship } from "@/lib/actions/relationships";
import { relationshipSchema, type RelationshipInput, type RelationshipValues } from "@/lib/validations/entities";
import { commonConnections, degreeOf, findExistingRelationship, personLabel } from "@/lib/admin/network";
import { RELATIONSHIP_TYPES, TONE_LABEL } from "@/lib/relationship-types";
import { RELATIONSHIP_TONE_VALUES, RELATIONSHIP_TYPE_VALUES, type Status } from "@/lib/db/enums";
import type { RelationshipRow } from "@/lib/db/database.types";
import { countLabel } from "@/lib/format";

const TYPE_OPTIONS = RELATIONSHIP_TYPE_VALUES.map((v) => ({ value: v, label: RELATIONSHIP_TYPES[v].label }));
const TONE_OPTIONS = RELATIONSHIP_TONE_VALUES.map((v) => ({ value: v, label: TONE_LABEL[v] }));

function toInput(row?: RelationshipRow, prefill?: { personA?: string; personB?: string }): RelationshipInput {
  return {
    id: row?.id,
    personA: row?.person_a ?? prefill?.personA ?? "",
    personB: row?.person_b ?? prefill?.personB ?? "",
    type: row?.type ?? "znajomi",
    strength: row?.strength ?? 50,
    sinceYear: row?.since_year ? String(row.since_year) : "",
    sinceDate: row?.since_date ?? "",
    untilYear: row?.until_year ? String(row.until_year) : "",
    untilDate: row?.until_date ?? "",
    description: row?.description ?? "",
    tone: row?.tone ?? null,
    confidence: row?.confidence ?? "confirmed",
    sourceType: row?.source_type ?? "personal",
    sourceNote: row?.source_note ?? "",
    locationId: row?.location_id ?? "",
    status: row?.status ?? "draft",
  };
}

interface RelationshipFormProps {
  relationship?: RelationshipRow;
  prefill?: { personA?: string; personB?: string };
  /** Person A is fixed (creating from a person's profile). */
  lockPersonA?: boolean;
  compact?: boolean;
  onSaved?: (id: string) => void;
  onEditExisting?: (id: string) => void;
}

export function RelationshipForm({ relationship, prefill, lockPersonA, compact, onSaved, onEditExisting }: RelationshipFormProps) {
  const router = useRouter();
  const { network, peopleById } = useAdminData();
  const { run, pending } = useServerAction();

  const form = useForm<RelationshipInput, unknown, RelationshipValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: toInput(relationship, prefill),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, getValues, setValue, setError, formState, reset } = form;
  const errors = formState.errors;
  useUnsavedChanges(`relationship-${relationship?.id ?? "new"}`, formState.isDirty && !pending);

  const [personA, personB, type, strength, sinceYear, sinceDate, status] = useWatch({
    control,
    name: ["personA", "personB", "type", "strength", "sinceYear", "sinceDate", "status"],
  });
  const a = personA ? peopleById.get(personA) : undefined;
  const b = personB ? peopleById.get(personB) : undefined;

  const existing = useMemo(
    () => (personA && personB && personA !== personB ? findExistingRelationship(network.relationships, personA, personB, relationship?.id) : undefined),
    [network.relationships, personA, personB, relationship?.id],
  );
  const common = useMemo(
    () => (personA && personB ? commonConnections(network.relationships, personA, personB) : []),
    [network.relationships, personA, personB],
  );
  const meta = RELATIONSHIP_TYPES[type ?? "znajomi"];
  const since = sinceYear || sinceDate?.slice(0, 4);

  const submit = (publish: boolean) =>
    handleSubmit(async () => {
      const values = getValues();
      const nextStatus: Status = publish ? "published" : (values.status as Status);
      const result = await run(() => saveRelationship({ ...values, status: nextStatus }), {
        onError: (r) => {
          for (const [field, message] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof RelationshipInput, { message });
        },
      });
      if (!result.ok) return;
      reset({ ...values, status: nextStatus });
      if (onSaved) onSaved(result.data.id);
      else if (!relationship) router.push(`/admin/relationships/${result.data.id}`);
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
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Field label="Osoba A" htmlFor="personA" required error={errors.personA?.message}>
          <Controller
            control={control}
            name="personA"
            render={({ field }) => (
              <PersonPicker id="personA" value={field.value} onChange={field.onChange} disabled={lockPersonA} invalid={Boolean(errors.personA)} exclude={personB ? [personB] : []} />
            )}
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          disabled={lockPersonA}
          onClick={() => {
            setValue("personA", personB, { shouldDirty: true });
            setValue("personB", personA, { shouldDirty: true });
          }}
          aria-label="Zamień osoby"
        >
          <ArrowLeftRight />
        </Button>
        <Field label="Osoba B" htmlFor="personB" required error={errors.personB?.message}>
          <Controller
            control={control}
            name="personB"
            render={({ field }) => (
              <PersonPicker id="personB" value={field.value} onChange={field.onChange} invalid={Boolean(errors.personB)} exclude={personA ? [personA] : []} />
            )}
          />
        </Field>
      </div>

      {/* Smart preview: duplicate check, mini graph, degrees, common friends */}
      {a && b && (
        <div className="grid gap-3 rounded-lg border bg-background/40 p-4">
          {existing ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-amber-200">
              <TriangleAlert className="size-4 text-amber-400" />
              <span className="font-medium">Ta relacja już istnieje.</span>
              {onEditExisting ? (
                <Button type="button" size="xs" variant="outline" onClick={() => onEditExisting(existing.id)}>
                  Edytuj istniejącą
                </Button>
              ) : (
                <Button asChild size="xs" variant="outline">
                  <Link href={`/admin/relationships/${existing.id}`}>Edytuj istniejącą</Link>
                </Button>
              )}
            </div>
          ) : (
            !relationship && (
              <p className="flex items-center gap-2 text-sm text-emerald-300">
                <CircleCheck className="size-4" /> Ta relacja jeszcze nie istnieje.
              </p>
            )
          )}

          <div className="flex items-center justify-center gap-2 py-2">
            <span className="flex flex-col items-center gap-1">
              <AdminAvatar person={a} size="md" />
              <span className="text-xs">{a.name}</span>
            </span>
            <span className="flex min-w-24 flex-1 flex-col items-center gap-1 sm:max-w-48">
              <span className="h-0.5 w-full rounded" style={{ background: meta.color, opacity: 0.3 + (strength ?? 50) / 140 }} />
              <span className="text-[11px] text-muted-foreground">
                {meta.label.toLowerCase()}
                {since ? ` · od ${since}` : ""}
              </span>
            </span>
            <span className="flex flex-col items-center gap-1">
              <AdminAvatar person={b} size="md" />
              <span className="text-xs">{b.name}</span>
            </span>
          </div>

          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>
              {a.name} ma obecnie {countLabel(degreeOf(network.relationships, a.id), "relację", "relacje", "relacji")}.
            </p>
            <p>
              {b.name} ma obecnie {countLabel(degreeOf(network.relationships, b.id), "relację", "relacje", "relacji")}.
            </p>
          </div>

          {common.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground">
                {a.name} i {b.name} mają {countLabel(common.length, "wspólne połączenie", "wspólne połączenia", "wspólnych połączeń")}:
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {common.map((id) => {
                  const p = peopleById.get(id);
                  return p ? (
                    <li key={id} className="flex items-center gap-1 rounded-md bg-secondary py-0.5 pl-0.5 pr-1.5">
                      <AdminAvatar person={p} size="xs" />
                      {personLabel(p)}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typ relacji" htmlFor="type" required error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => <OptionSelect id="type" value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} />}
          />
        </Field>
        <Field label="Pewność informacji" htmlFor="confidence">
          <Controller
            control={control}
            name="confidence"
            render={({ field }) => <OptionSelect id="confidence" value={field.value} onChange={field.onChange} options={CONFIDENCE_OPTIONS} />}
          />
        </Field>
        <Field label="Od kiedy" error={errors.sinceYear?.message ?? errors.sinceDate?.message}>
          <YearOrDate
            idPrefix="since"
            year={sinceYear ?? ""}
            date={sinceDate ?? ""}
            onYear={(v) => setValue("sinceYear", v, { shouldDirty: true, shouldValidate: true })}
            onDate={(v) => setValue("sinceDate", v, { shouldDirty: true, shouldValidate: true })}
          />
        </Field>
        {!compact && (
          <Field label="Do kiedy" hint="Opcjonalnie — jeśli relacja się skończyła." error={errors.untilYear?.message}>
            <Controller
              control={control}
              name="untilYear"
              render={({ field }) => (
                <YearOrDate
                  idPrefix="until"
                  year={field.value ?? ""}
                  date={getValues("untilDate") ?? ""}
                  onYear={(v) => field.onChange(v)}
                  onDate={(v) => setValue("untilDate", v, { shouldDirty: true })}
                />
              )}
            />
          </Field>
        )}
      </div>

      <Field label="Siła relacji" htmlFor="strength">
        <Controller
          control={control}
          name="strength"
          render={({ field }) => (
            <div className="flex items-center gap-4">
              <Slider
                id="strength"
                min={0}
                max={100}
                step={5}
                value={[field.value]}
                onValueChange={([v]) => field.onChange(v)}
                className="flex-1"
                aria-label="Siła relacji"
              />
              <span className="w-28 text-right text-sm">{strengthLabel(field.value)}</span>
            </div>
          )}
        />
      </Field>

      <Field label="W jaki sposób się znają?" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={3} placeholder="np. Poznali się na boisku przy szkole." {...register("description")} />
      </Field>

      {!compact && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Charakter" htmlFor="tone">
            <Controller
              control={control}
              name="tone"
              render={({ field }) => (
                <OptionSelect id="tone" value={field.value ?? ""} onChange={(v) => field.onChange(v || null)} options={TONE_OPTIONS} allowEmpty />
              )}
            />
          </Field>
          <Field label="Źródło" htmlFor="sourceType">
            <Controller
              control={control}
              name="sourceType"
              render={({ field }) => <OptionSelect id="sourceType" value={field.value} onChange={field.onChange} options={SOURCE_OPTIONS} />}
            />
          </Field>
          <Field label="Miejsce" htmlFor="locationId">
            <Controller
              control={control}
              name="locationId"
              render={({ field }) => <LocationSelect id="locationId" value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="Notatka o źródle" htmlFor="sourceNote" hint="Tylko dla admina." className="sm:col-span-3">
            <Input id="sourceNote" {...register("sourceNote")} />
          </Field>
        </div>
      )}

      <Field label="Status">
        <Controller control={control} name="status" render={({ field }) => <StatusSegment value={field.value as Status} onChange={field.onChange} />} />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {formState.isDirty && <span className="mr-auto text-xs text-amber-300">Niezapisane zmiany</span>}
        <Button type="submit" variant="outline" disabled={pending || Boolean(existing)}>
          {pending && <Loader2 className="animate-spin" />}
          Zapisz
        </Button>
        {status !== "published" && (
          <Button type="button" disabled={pending || Boolean(existing)} onClick={() => void submit(true)}>
            Zapisz i opublikuj
          </Button>
        )}
      </div>
    </form>
  );
}
