"use client";

import { useState } from "react";
import { Download, FileJson, Loader2, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Section } from "@/components/admin/common/layout";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { importData } from "@/lib/actions/data";
import { analyzeImport, importSchema, type ImportPayload, type ImportPreview } from "@/lib/validations/import";
import { cn } from "@/lib/utils";

export function ImportExport() {
  const { network } = useAdminData();
  const confirm = useConfirm();
  const { run, pending } = useServerAction();
  const [fileName, setFileName] = useState<string | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [typed, setTyped] = useState("");

  const load = async (file: File) => {
    setFileName(file.name);
    setPayload(null);
    setPreview(null);
    setError(null);
    if (file.size > 20 * 1024 * 1024) return setError("Plik jest za duży (maks. 20 MB).");
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return setError("To nie jest poprawny plik JSON.");
    }
    const parsed = importSchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return setError(`Nieprawidłowa struktura pliku: ${issue.path.join(".") || "(korzeń)"} — ${issue.message}`);
    }
    setPayload(parsed.data);
    setPreview(analyzeImport(parsed.data, { people: network.people, relationships: network.relationships }));
  };

  const doImport = async () => {
    if (!payload || !preview) return;
    const ok = await confirm({
      title: mode === "replace" ? "Zastąpić wszystkie dane?" : "Zaimportować dane?",
      description:
        mode === "replace"
          ? "Wszystkie obecne osoby, relacje, wydarzenia, lore i lokalizacje zostaną usunięte i zastąpione zawartością pliku."
          : "Nowe wpisy zostaną dodane. Istniejące (to samo id lub slug) zostaną pominięte — nic nie zostanie nadpisane.",
      warning: preview.warnings.length ? `Plik ma ${preview.warnings.length} ostrzeżeń — sprawdź listę przed importem.` : undefined,
      confirmLabel: "Importuj",
      destructive: mode === "replace",
    });
    if (!ok) return;
    await run(() => importData({ payload, mode, confirmation: typed }), {
      onSuccess: () => {
        setPayload(null);
        setPreview(null);
        setFileName(null);
        setTyped("");
      },
    });
  };

  return (
    <div className="grid gap-6">
      <Section title="Eksport danych" description="Cała baza (osoby, relacje, wydarzenia, lore, lokalizacje, powiązania, metadane zdjęć) jako JSON.">
        <Button asChild variant="outline">
          {/* Route handler download; not a client navigation */}
          <a href="/admin/export" download>
            <Download /> Eksportuj do JSON
          </a>
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Pliki zdjęć zostają w Supabase Storage — eksport zawiera ich ścieżki.</p>
      </Section>

      <Section title="Import danych" description="Plik w formacie eksportu. Przed importem zobaczysz podsumowanie i ostrzeżenia.">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center hover:border-ring">
          <FileJson className="size-5 text-muted-foreground" />
          <span className="text-sm">{fileName ?? "Wybierz plik .json"}</span>
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void load(f);
            }}
          />
        </label>

        {error && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        {preview && (
          <div className="mt-4 grid gap-4">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["Osoby", preview.counts.people],
                  ["Relacje", preview.counts.relationships],
                  ["Wydarzenia", preview.counts.events],
                  ["Lore", preview.counts.lore],
                  ["Miejsca", preview.counts.locations],
                ] as const
              ).map(([label, n]) => (
                <div key={label} className="rounded-md border px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>

            {preview.warnings.length > 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
                  <TriangleAlert className="size-4" /> Ostrzeżenia ({preview.warnings.length})
                </p>
                <ul className="mt-2 grid max-h-48 gap-1 overflow-y-auto text-xs text-amber-100/90">
                  {preview.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-emerald-300">Brak ostrzeżeń — plik wygląda poprawnie.</p>
            )}

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Tryb importu</legend>
              {(
                [
                  ["merge", "Scal", "Dodaj nowe wpisy, pomiń istniejące. Bezpieczne."],
                  ["replace", "Zastąp wszystko", "Usuń obecne dane i wczytaj plik. Nieodwracalne."],
                ] as const
              ).map(([value, label, hint]) => (
                <label key={value} className={cn("flex cursor-pointer gap-3 rounded-md border p-3", mode === value && "border-ring bg-accent/40")}>
                  <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {mode === "replace" && (
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  Wpisz <strong className="font-mono text-foreground">ZASTĄP</strong>, aby potwierdzić zastąpienie danych.
                </span>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} className="max-w-xs" />
              </label>
            )}

            <div>
              <Button onClick={() => void doImport()} disabled={pending || (mode === "replace" && typed !== "ZASTĄP")}>
                {pending ? <Loader2 className="animate-spin" /> : <Upload />}
                Importuj
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
