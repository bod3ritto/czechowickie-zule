"use client";

import { createMediaUpload, registerMedia } from "@/lib/actions/media";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/media-constants";
import type { MediaKind } from "@/lib/db/enums";

export type OwnerType = "person" | "event" | "lore";

export function validateImage(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Dozwolone formaty: JPG, PNG, WebP, GIF, AVIF.";
  if (file.size > MAX_IMAGE_BYTES) return "Plik jest za duży (maks. 5 MB).";
  return null;
}

function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** PUT to a signed Storage URL with upload progress (fetch can't report it). */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

/**
 * 1) server action → signed upload URL (admin-only),
 * 2) browser uploads directly to Supabase Storage,
 * 3) server action registers the file in the `media` table.
 */
export async function uploadImage(
  file: File,
  opts: { ownerType: OwnerType; ownerId: string; kind: MediaKind; makePrimary?: boolean; onProgress?: (pct: number) => void },
): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  const invalid = validateImage(file);
  if (invalid) return { ok: false, error: invalid };

  const ticket = await createMediaUpload({
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  if (!ticket.ok) return { ok: false, error: ticket.error };

  try {
    await putWithProgress(ticket.data.signedUrl, file, opts.onProgress ?? (() => {}));
  } catch {
    return { ok: false, error: "Wysyłanie pliku nie powiodło się." };
  }

  const size = await imageSize(file);
  const saved = await registerMedia({
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    path: ticket.data.path,
    kind: opts.kind,
    makePrimary: opts.makePrimary,
    mimeType: file.type,
    size: file.size,
    width: size?.width,
    height: size?.height,
  });
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, id: saved.data.id, url: saved.data.url };
}
