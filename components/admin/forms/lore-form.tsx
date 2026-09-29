"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Field } from "@/components/admin/common/layout";
import { MultiPersonPicker } from "@/components/admin/common/person-picker";
import { CONFIDENCE_OPTIONS, OptionSelect, SOURCE_OPTIONS, StatusSegment } from "@/components/admin/common/inputs";
import { useUnsavedChanges } from "@/components/admin/providers/unsaved-changes";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { saveLore } from "@/lib/actions/lore";
import { loreSchema, type LoreInput, type LoreValues } from "@/lib/validations/entities";
import { CONFIDENCE_BADGE, LORE_TYPE_LABEL } from "@/lib/relationship-types";
import { LORE_TYPE_VALUES, type Status } from "@/lib/db/enums";
import type { LoreRow } from "@/lib/db/database.types";
import type { Confidence } from "@/types/domain";

const TYPE_OPTIONS = LORE_TYPE_VALUES.map((v) => ({ value: v, label: LORE_TYPE_LABEL[v] }));

function toInput(row?: LoreRow & { people: string[] }, prefillPeople: string[] = []): LoreInput {
  return {
    id: row?.id,
    title: row?.title ?? "",
    content: row?.content ?? "",
    loreType: row?.lore_type ?? "ciekawostka",
    year: row?.year ? String(row.year) : "",
    confidence: row?.confidence ?? "lore",
    sourceType: row?.source_type ?? "personal",
    sourceNote: row?.source_note ?? "",
    people: row?.people ?? prefillPeople,
    status: row?.status ?? "draft",
  };
}

export function LoreForm({
  lore,
  prefillPeople,
  compact,
  onSaved,
}: {
  lore?: LoreRow & { people: string[] };
  prefillPeople?: string[];
  compact?: boolean;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const form = useForm<LoreInput, unknown, LoreValues>({ resolver: zodResolver(loreSchema), defaultValues: toInput(lore, prefillPeople), mode: "onTouched" });
  const { register, control, handleSubmit, getValues, setError, formState, reset } = form;
  const errors = formState.errors;
  useUnsavedChanges(`lore-${lore?.id ?? "new"}`, formState.isDirty && !pending);
  const [confidence, status] = useWatch({ control, name: ["confidence", "status"] });
  const badge = CONFIDENCE_BADGE[confidence as Confidence];

  const submit = (publish: boolean) =>
    handleSubmit(async () => {
      const values = getValues();
      const nextStatus: Status = publish ? "published" : (values.status as Status);
      const result = await run(() => saveLore({ ...values, status: nextStatus }), {
        onError: (r) => {
          for (const [field, message] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof LoreInput, { message });
        },
      });
      if (!result.ok) return;
      reset({ ...values, status: nextStatus });
      if (onSaved) onSaved(result.data.id);
      else if (!lore) router.push(`/admin/lore/${result.data.id}`);
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
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
        <Field label="Tytuł" htmlFor="title" hint="Opcjonalny." error={errors.title?.message}>
          <Input id="title" placeholder="np. Skrót przez pół miasta" {...register("title")} />
        </Field>
        <Field label="Typ" htmlFor="loreType">
          <Controller control={control} name="loreType" render={({ field }) => <OptionSelect id="loreType" value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} />} />
        </Field>
      </div>

      <Field label="Treść" htmlFor="content" required error={errors.content?.message}>
        <Textarea id="content" rows={compact ? 3 : 5} autoFocus={!lore} aria-invalid={Boolean(errors.content)} {...register("content")} />
      </Field>

      <Field label="Osoby">
        <Controller control={control} name="people" render={({ field }) => <MultiPersonPicker value={field.value} onChange={field.onChange} />} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Rok" htmlFor="year" error={errors.year?.message}>
          <Input id="year" inputMode="numeric" maxLength={4} {...register("year")} />
        </Field>
        <Field label="Pewność" htmlFor="confidence">
          <Controller control={control} name="confidence" render={({ field }) => <OptionSelect id="confidence" value={field.value} onChange={field.onChange} options={CONFIDENCE_OPTIONS} />} />
        </Field>
        <Field label="Źródło" htmlFor="sourceType">
          <Controller control={control} name="sourceType" render={({ field }) => <OptionSelect id="sourceType" value={field.value} onChange={field.onChange} options={SOURCE_OPTIONS} />} />
        </Field>
      </div>

      <p className="flex items-start gap-2 rounded-md border bg-background/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {badge ? (
          <span>
            Publicznie ten wpis będzie oznaczony jako <strong className="text-foreground">„{badge}”</strong> — niezweryfikowane informacje nigdy nie są pokazywane jako fakty.
          </span>
        ) : (
          <span>Potwierdzone informacje są pokazywane publicznie bez dodatkowego oznaczenia.</span>
        )}
      </p>

      {!compact && (
        <Field label="Notatka o źródle" htmlFor="sourceNote" hint="Tylko dla admina.">
          <Input id="sourceNote" {...register("sourceNote")} />
        </Field>
      )}

      <Field label="Publikacja">
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
