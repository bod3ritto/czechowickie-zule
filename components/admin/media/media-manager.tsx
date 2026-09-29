"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { deleteMedia, setPrimaryMedia } from "@/lib/actions/media";
import type { MediaKind } from "@/lib/db/enums";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/providers/confirm";
import { uploadImage, validateImage, type OwnerType } from "./upload";

export interface MediaFile {
  id: string;
  url: string;
  is_primary: boolean;
  alt: string | null;
  width: number | null;
  height: number | null;
}

interface PendingUpload {
  key: string;
  preview: string;
  progress: number;
  error?: string;
}

/**
 * Drag & drop uploads with local preview and progress, delete, and "set as
 * main photo" (the main photo of a person is their public avatar).
 */
export function MediaManager({
  ownerType,
  ownerId,
  kind,
  files,
  title = "Zdjęcia",
}: {
  ownerType: OwnerType;
  ownerId: string;
  kind: MediaKind;
  files: MediaFile[];
  title?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const start = async (list: FileList | File[]) => {
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const problem = validateImage(file);
      if (problem) toast.error(`${file.name}: ${problem}`);
      else accepted.push(file);
    }
    for (const file of accepted) {
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      setPending((p) => [...p, { key, preview, progress: 0 }]);
      const result = await uploadImage(file, {
        ownerType,
        ownerId,
        kind,
        onProgress: (progress) => setPending((p) => p.map((u) => (u.key === key ? { ...u, progress } : u))),
      });
      if (result.ok) {
        setPending((p) => p.filter((u) => u.key !== key));
        URL.revokeObjectURL(preview);
        toast.success("Zdjęcie dodane.");
        router.refresh();
      } else {
        setPending((p) => p.map((u) => (u.key === key ? { ...u, error: result.error } : u)));
        toast.error(result.error);
      }
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void start(e.dataTransfer.files);
  };

  const makePrimary = async (id: string) => {
    setBusy(id);
    const r = await setPrimaryMedia({ mediaId: id, ownerType, ownerId });
    setBusy(null);
    if (r.ok) {
      toast.success(r.message ?? "Zapisano.");
      router.refresh();
    } else toast.error(r.error);
  };

  const remove = async (file: MediaFile) => {
    const yes = await confirm({
      title: "Usunąć zdjęcie?",
      description: "Plik zostanie trwale usunięty z magazynu.",
      warning: file.is_primary ? "To jest główne zdjęcie. Po usunięciu jego rolę przejmie inne zdjęcie albo inicjały." : undefined,
      confirmLabel: "Usuń",
      destructive: true,
    });
    if (!yes) return;
    setBusy(file.id);
    const r = await deleteMedia({ mediaId: file.id });
    setBusy(null);
    if (r.ok) {
      toast.success(r.message ?? "Usunięto.");
      router.refresh();
    } else toast.error(r.error);
  };

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:border-ring",
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm">
          Przeciągnij {title.toLowerCase()} tutaj albo{" "}
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => input.current?.click()}>
            wybierz z dysku
          </button>
        </p>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF, AVIF · do 5 MB</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void start(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length === 0 && pending.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="size-4" /> Brak zdjęć.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pending.map((u) => (
            <li key={u.key} className="relative overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.preview} alt="" className="aspect-square w-full object-cover opacity-60" />
              <div className="absolute inset-x-2 bottom-2">
                {u.error ? (
                  <p className="rounded bg-destructive/90 px-2 py-1 text-[11px] text-white">{u.error}</p>
                ) : (
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
              </div>
            </li>
          ))}
          {files.map((f) => (
            <li key={f.id} className={cn("group relative overflow-hidden rounded-lg border", f.is_primary && "ring-2 ring-amber-400/70")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.alt ?? ""} className="aspect-square w-full object-cover" />
              {f.is_primary && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-amber-300">
                  <Star className="size-3 fill-current" /> Główne
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/80 p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                {busy === f.id && <Loader2 className="mr-auto size-4 animate-spin text-white" />}
                {!f.is_primary && (
                  <Button size="icon-sm" variant="secondary" onClick={() => makePrimary(f.id)} aria-label="Ustaw jako główne" title="Ustaw jako główne">
                    <Star />
                  </Button>
                )}
                <Button size="icon-sm" variant="secondary" onClick={() => remove(f)} aria-label="Usuń zdjęcie" title="Usuń">
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
