"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Field } from "@/components/admin/common/layout";
import { CONFIDENCE_OPTIONS, LocationSelect, OptionSelect, StatusSegment, TagsInput } from "@/components/admin/common/inputs";
import { AdminAvatar } from "@/components/admin/common/person-picker";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useUnsavedChanges } from "@/components/admin/providers/unsaved-changes";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { uploadImage, validateImage } from "@/components/admin/media/upload";
import { savePerson } from "@/lib/actions/people";
import { personSchema, type PersonInput, type PersonValues } from "@/lib/validations/entities";
import { findSimilarPeople, personLabel, slugify, uniqueSlug } from "@/lib/admin/network";
import { PERSON_CATEGORIES } from "@/lib/relationship-types";
import { PERSON_CATEGORY_VALUES, type Status } from "@/lib/db/enums";
import type { PersonRow } from "@/lib/db/database.types";

const TAG_SUGGESTIONS = ["Czechowice", "Dziedzice", "sport", "szkoła", "praca", "imprezy"];
const CATEGORY_OPTIONS = PERSON_CATEGORY_VALUES.map((v) => ({ value: v, label: PERSON_CATEGORIES[v].label }));

function toInput(row?: PersonRow): PersonInput {
  return {
    id: row?.id,
    firstName: row?.first_name ?? "",
    lastName: row?.last_name ?? "",
    nickname: row?.nickname ?? "",
    slug: row?.slug ?? "",
    bio: row?.bio ?? "",
    legend: row?.legend ?? "",
    category: row?.category ?? "bywalec",
    status: row?.status ?? "draft",
    tags: row?.tags ?? [],
    aliases: row?.aliases ?? [],
    birthDate: row?.birth_date ?? "",
    firstSeen: row?.first_seen ? String(row.first_seen) : "",
    locationId: row?.location_id ?? "",
    adminNotes: row?.admin_notes ?? "",
    newLore: [],
  };
}

interface PersonFormProps {
  person?: PersonRow;
  /** Compact variant for the quick-add sheet. */
  compact?: boolean;
  onSaved?: (id: string) => void;
}

export function PersonForm({ person, compact, onSaved }: PersonFormProps) {
  const router = useRouter();
  const { network } = useAdminData();
  const { run, pending } = useServerAction();
  const isNew = !person;
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [avatar, setAvatar] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<PersonInput, unknown, PersonValues>({
    resolver: zodResolver(personSchema),
    defaultValues: toInput(person),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setValue, getValues, setError, formState, reset } = form;
  const errors = formState.errors;
  const lore = useFieldArray({ control, name: "newLore" });
  useUnsavedChanges(`person-${person?.id ?? "new"}`, formState.isDirty && !pending && !uploading);

  const [firstName, nickname, status, slug] = useWatch({ control, name: ["firstName", "nickname", "status", "slug"] });

  const takenSlugs = useMemo(() => network.people.filter((p) => p.id !== person?.id).map((p) => p.slug), [network.people, person?.id]);
  const similar = useMemo(
    () => (isNew ? findSimilarPeople(network.people, { name: firstName, nickname }) : []),
    [isNew, network.people, firstName, nickname],
  );

  const autoSlug = (first: string, nick: string | null | undefined) => {
    if (slugTouched) return;
    const base = slugify(nick && nick !== first ? `${first}-${nick}` : first);
    setValue("slug", base ? uniqueSlug(base, takenSlugs) : "", { shouldDirty: true });
  };

  const submit = (publish: boolean) =>
    handleSubmit(async () => {
      const values = getValues();
      const nextStatus: Status = publish ? "published" : (values.status as Status);
      const result = await run(() => savePerson({ ...values, status: nextStatus }), {
        refresh: false,
        onError: (r) => {
          for (const [field, message] of Object.entries(r.fieldErrors ?? {})) {
            setError(field as keyof PersonInput, { message });
          }
        },
      });
      if (!result.ok) return;
      const { id } = result.data;
      reset({ ...values, status: nextStatus, newLore: [] });

      if (avatar) {
        setUploading(true);
        const up = await uploadImage(avatar.file, { ownerType: "person", ownerId: id, kind: "avatar", makePrimary: true });
        setUploading(false);
        if (!up.ok) toast.error(`Osoba zapisana, ale avatar nie: ${up.error}`);
        URL.revokeObjectURL(avatar.preview);
        setAvatar(null);
      }

      router.refresh();
      if (onSaved) onSaved(id);
      else if (isNew) router.push(`/admin/people/${id}`);
    })();

  const busy = pending || uploading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      className="grid gap-6"
      noValidate
    >
      <div className={compact ? "grid gap-4" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Imię" htmlFor="firstName" required error={errors.firstName?.message}>
              <Input
                id="firstName"
                autoFocus={isNew}
                aria-invalid={Boolean(errors.firstName)}
                {...register("firstName", { onChange: (e) => autoSlug(e.target.value, getValues("nickname")) })}
              />
            </Field>
            <Field label="Ksywka" htmlFor="nickname" error={errors.nickname?.message}>
              <Input id="nickname" {...register("nickname", { onChange: (e) => autoSlug(getValues("firstName"), e.target.value) })} />
            </Field>
            {!compact && (
              <Field label="Nazwisko" htmlFor="lastName" hint="Widoczne tylko w panelu." error={errors.lastName?.message}>
                <Input id="lastName" {...register("lastName")} />
              </Field>
            )}
            <Field label="Slug (adres URL)" htmlFor="slug" required error={errors.slug?.message} hint={`/osoba/${slug || "…"}`}>
              <Input
                id="slug"
                aria-invalid={Boolean(errors.slug)}
                className="font-mono text-xs"
                {...register("slug", { onChange: () => setSlugTouched(true) })}
              />
            </Field>
          </div>

          {similar.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-amber-200">
                <TriangleAlert className="size-4" /> Możliwe podobne osoby
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Sprawdź, czy ta osoba nie jest już na mapie. Możesz mimo to kontynuować.</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {similar.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/people/${p.id}`} className="flex items-center gap-1.5 rounded-md border bg-background/60 py-1 pl-1 pr-2 text-xs hover:bg-background">
                      <AdminAvatar person={p} size="xs" />
                      {personLabel(p)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Field label="Kim jest ta osoba?" htmlFor="bio" error={errors.bio?.message}>
            <Textarea
              id="bio"
              rows={compact ? 2 : 3}
              placeholder="np. Jeden z najbardziej rozpoznawalnych ludzi w lokalnej ekipie."
              {...register("bio")}
            />
          </Field>

          {!compact && (
            <>
              <Field label="Legenda" htmlFor="legend" hint="Cytat pod opisem, np. „Legenda głosi, że…”" error={errors.legend?.message}>
                <Input id="legend" {...register("legend")} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tagi" htmlFor="tags">
                  <Controller
                    control={control}
                    name="tags"
                    render={({ field }) => <TagsInput id="tags" value={field.value} onChange={field.onChange} suggestions={TAG_SUGGESTIONS} />}
                  />
                </Field>
                <Field label="Inne ksywki / pisownie" htmlFor="aliases" hint="Pomagają w wyszukiwaniu.">
                  <Controller
                    control={control}
                    name="aliases"
                    render={({ field }) => <TagsInput id="aliases" value={field.value} onChange={field.onChange} />}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Data urodzenia" htmlFor="birthDate" hint="Opcjonalnie, tylko w panelu." error={errors.birthDate?.message}>
                  <Input id="birthDate" type="date" {...register("birthDate")} />
                </Field>
                <Field label="Na mapie od (rok)" htmlFor="firstSeen" error={errors.firstSeen?.message}>
                  <Input id="firstSeen" inputMode="numeric" maxLength={4} placeholder="np. 2016" {...register("firstSeen")} />
                </Field>
                <Field label="Miejsce" htmlFor="locationId">
                  <Controller
                    control={control}
                    name="locationId"
                    render={({ field }) => <LocationSelect id="locationId" value={field.value} onChange={field.onChange} />}
                  />
                </Field>
              </div>

              {isNew && (
                <fieldset className="grid gap-3 rounded-lg border p-4">
                  <legend className="px-1 text-xs font-medium text-muted-foreground">Lore — ciekawostki</legend>
                  {lore.fields.length === 0 && (
                    <p className="text-xs text-muted-foreground">np. „Podobno zna każdy skrót w Czechowicach.”</p>
                  )}
                  {lore.fields.map((f, i) => (
                    <div key={f.id} className="grid gap-2 rounded-md border bg-background/40 p-3">
                      <div className="flex gap-2">
                        <Textarea rows={2} placeholder="Treść ciekawostki" {...register(`newLore.${i}.content`)} aria-label="Treść ciekawostki" />
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => lore.remove(i)} aria-label="Usuń ciekawostkę">
                          <Trash2 />
                        </Button>
                      </div>
                      {errors.newLore?.[i]?.content && <p className="text-xs text-destructive">{errors.newLore[i]?.content?.message}</p>}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Controller
                          control={control}
                          name={`newLore.${i}.confidence`}
                          render={({ field }) => <OptionSelect value={field.value} onChange={field.onChange} options={CONFIDENCE_OPTIONS} />}
                        />
                        <Input placeholder="Rok" inputMode="numeric" maxLength={4} {...register(`newLore.${i}.year`)} aria-label="Rok" />
                        <Input placeholder="Źródło (tylko admin)" {...register(`newLore.${i}.sourceNote`)} aria-label="Źródło" />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => lore.append({ content: "", confidence: "lore", year: "", sourceNote: "" })}
                  >
                    <Plus /> Dodaj ciekawostkę
                  </Button>
                </fieldset>
              )}
            </>
          )}
        </div>

        {/* Side column: avatar, status, category, notes */}
        <aside className="grid content-start gap-4">
          {isNew && (
            <Field label="Avatar" htmlFor="avatar">
              <div className="flex items-center gap-3">
                {avatar ? (
                  <span className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatar.preview} alt="" className="size-16 rounded-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(avatar.preview);
                        setAvatar(null);
                      }}
                      className="absolute -right-1 -top-1 rounded-full bg-secondary p-0.5"
                      aria-label="Usuń avatar"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ) : (
                  <span className="grid size-16 place-items-center rounded-full border border-dashed text-muted-foreground">
                    <ImagePlus className="size-5" />
                  </span>
                )}
                <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  <input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const problem = validateImage(file);
                      if (problem) return toast.error(problem);
                      if (avatar) URL.revokeObjectURL(avatar.preview);
                      setAvatar({ file, preview: URL.createObjectURL(file) });
                    }}
                  />
                  <span className="underline underline-offset-2">{avatar ? "Zmień" : "Wybierz zdjęcie"}</span>
                  <span className="block">JPG/PNG/WebP, do 5 MB</span>
                </label>
              </div>
            </Field>
          )}
          <Field label="Status" htmlFor="status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => <StatusSegment value={field.value as Status} onChange={field.onChange} />}
            />
          </Field>
          <Field label="Kategoria na mapie" htmlFor="category">
            <Controller
              control={control}
              name="category"
              render={({ field }) => <OptionSelect id="category" value={field.value} onChange={field.onChange} options={CATEGORY_OPTIONS} />}
            />
          </Field>
          {!compact && (
            <Field label="Notatki admina" htmlFor="adminNotes" hint="Nigdy nie są publiczne.">
              <Textarea id="adminNotes" rows={4} {...register("adminNotes")} />
            </Field>
          )}
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {formState.isDirty && <span className="mr-auto text-xs text-amber-300">Niezapisane zmiany</span>}
        <Button type="submit" variant="outline" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          Zapisz
        </Button>
        {status !== "published" && (
          <Button type="button" disabled={busy} onClick={() => void submit(true)}>
            Zapisz i opublikuj
          </Button>
        )}
      </div>
    </form>
  );
}
