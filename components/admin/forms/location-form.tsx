"use client";

import { useForm } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Field } from "@/components/admin/common/layout";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { saveLocation } from "@/lib/actions/locations";
import { locationSchema, type LocationInput } from "@/lib/validations/entities";
import type { LocationRow } from "@/lib/db/database.types";

export function LocationForm({ location, onSaved }: { location?: LocationRow; onSaved?: () => void }) {
  const { run, pending } = useServerAction();
  const { register, handleSubmit, getValues, setError, formState } = useForm<LocationInput, unknown, z.output<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      id: location?.id,
      name: location?.name ?? "",
      description: location?.description ?? "",
      address: location?.address ?? "",
      lat: location?.lat != null ? String(location.lat) : "",
      lng: location?.lng != null ? String(location.lng) : "",
    },
  });
  const errors = formState.errors;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={handleSubmit(async () => {
        const r = await run(() => saveLocation(getValues()), {
          onError: (res) => {
            for (const [field, message] of Object.entries(res.fieldErrors ?? {})) setError(field as keyof LocationInput, { message });
          },
        });
        if (r.ok) onSaved?.();
      })}
    >
      <Field label="Nazwa" htmlFor="loc-name" required error={errors.name?.message}>
        <Input id="loc-name" autoFocus placeholder="np. Boisko przy szkole" {...register("name")} />
      </Field>
      <Field label="Opis" htmlFor="loc-description">
        <Textarea id="loc-description" rows={2} {...register("description")} />
      </Field>
      <Field label="Adres / opis lokalizacji" htmlFor="loc-address" hint="Tylko w panelu — publicznie widoczna jest nazwa.">
        <Input id="loc-address" {...register("address")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Szerokość (lat)" htmlFor="loc-lat" error={errors.lat?.message}>
          <Input id="loc-lat" inputMode="decimal" placeholder="49.9118" {...register("lat")} />
        </Field>
        <Field label="Długość (lng)" htmlFor="loc-lng" error={errors.lng?.message}>
          <Input id="loc-lng" inputMode="decimal" placeholder="19.0066" {...register("lng")} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Współrzędne skopiujesz z Google Maps (prawy klik → pierwsza pozycja). Posłużą przyszłej mapie „Ta historia wydarzyła się tutaj”.
      </p>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Zapisz
        </Button>
      </div>
    </form>
  );
}
