"use server";

import { z } from "zod";
import { adminAction, revalidatePublic, type AdminDb } from "./admin-action";
import { fail, friendlyDbError, ok } from "./result";
import { MEDIA_BUCKET, mediaPublicUrl } from "@/lib/env";
import { MEDIA_KIND_VALUES } from "@/lib/db/enums";

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES as MAX_BYTES } from "@/lib/media-constants";

const owner = z.object({
  ownerType: z.enum(["person", "event", "lore"]),
  ownerId: z.uuid(),
});

const ownerColumn = { person: "person_id", event: "event_id", lore: "lore_id" } as const;

/**
 * Step 1: the server (as the admin) creates a short-lived signed upload URL.
 * The browser uploads straight to Storage with it (with progress), so no
 * Supabase keys or sessions are needed client-side and nothing is base64'd.
 */
const createUploadAction = adminAction(
  owner.extend({
    fileName: z.string().min(1).max(200),
    contentType: z.enum(ALLOWED_IMAGE_TYPES, "Dozwolone są tylko obrazy JPG, PNG, WebP, GIF i AVIF."),
    size: z.number().int().positive().max(MAX_BYTES, "Maksymalny rozmiar pliku to 5 MB."),
  }),
  async ({ ownerType, ownerId, fileName, contentType }, { db }) => {
    const ext = (fileName.split(".").pop() ?? contentType.split("/")[1]).toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
    const path = `${ownerType}/${ownerId}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await db.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[media] signed upload url:", error?.message);
      return fail("Nie udało się przygotować wysyłki pliku.");
    }
    return ok({ path: data.path, signedUrl: data.signedUrl });
  },
);

export async function createMediaUpload(input: {
  ownerType: "person" | "event" | "lore";
  ownerId: string;
  fileName: string;
  contentType: string;
  size: number;
}) {
  return createUploadAction(input as Parameters<typeof createUploadAction>[0]);
}

async function makePrimary(db: AdminDb, mediaId: string, ownerType: keyof typeof ownerColumn, ownerId: string) {
  const column = ownerColumn[ownerType];
  const reset = await db.from("media").update({ is_primary: false }).eq(column, ownerId).neq("id", mediaId);
  if (reset.error) return reset.error;
  const { error } = await db.from("media").update({ is_primary: true }).eq("id", mediaId);
  return error;
}

/** Step 2: after a successful upload, register the file in the media table. */
const registerAction = adminAction(
  owner.extend({
    path: z.string().min(1).max(300),
    kind: z.enum(MEDIA_KIND_VALUES),
    alt: z.string().trim().max(300).optional(),
    makePrimary: z.boolean().optional(),
    mimeType: z.string().max(60).optional(),
    size: z.number().int().nonnegative().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }),
  async (v, { db }) => {
    if (!v.path.startsWith(`${v.ownerType}/${v.ownerId}/`)) return fail("Nieprawidłowa ścieżka pliku.");
    const column = ownerColumn[v.ownerType];
    const { count } = await db.from("media").select("id", { count: "exact", head: true }).eq(column, v.ownerId);
    const { data, error } = await db
      .from("media")
      .insert({
        storage_path: v.path,
        kind: v.kind,
        person_id: v.ownerType === "person" ? v.ownerId : null,
        event_id: v.ownerType === "event" ? v.ownerId : null,
        lore_id: v.ownerType === "lore" ? v.ownerId : null,
        alt: v.alt ?? null,
        mime_type: v.mimeType ?? null,
        size_bytes: v.size ?? null,
        width: v.width ?? null,
        height: v.height ?? null,
      })
      .select("id")
      .single();
    if (error || !data) return fail(friendlyDbError(error ?? {}));
    // The first file of an owner becomes its main photo automatically.
    if (v.makePrimary || !count) await makePrimary(db, data.id, v.ownerType, v.ownerId);
    revalidatePublic();
    return ok({ id: data.id, url: mediaPublicUrl(v.path) }, "Zdjęcie dodane.");
  },
);

export async function registerMedia(input: z.input<typeof owner> & {
  path: string;
  kind: (typeof MEDIA_KIND_VALUES)[number];
  alt?: string;
  makePrimary?: boolean;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}) {
  return registerAction(input);
}

const primaryAction = adminAction(owner.extend({ mediaId: z.uuid() }), async ({ mediaId, ownerType, ownerId }, { db }) => {
  const error = await makePrimary(db, mediaId, ownerType, ownerId);
  if (error) return fail(friendlyDbError(error));
  revalidatePublic();
  return ok(undefined, "Ustawiono główne zdjęcie.");
});

export async function setPrimaryMedia(input: { mediaId: string; ownerType: "person" | "event" | "lore"; ownerId: string }) {
  return primaryAction(input);
}

const deleteAction = adminAction(z.object({ mediaId: z.uuid() }), async ({ mediaId }, { db }) => {
  const { data: row } = await db.from("media").select("storage_path").eq("id", mediaId).single();
  if (!row) return fail("Nie znaleziono pliku.");
  const { error: storageError } = await db.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
  if (storageError) console.error("[media] storage remove:", storageError.message);
  const { error } = await db.from("media").delete().eq("id", mediaId);
  if (error) return fail(friendlyDbError(error, "Nie udało się usunąć zdjęcia."));
  revalidatePublic();
  return ok(undefined, "Usunięto zdjęcie.");
});

export async function deleteMedia(input: { mediaId: string }) {
  return deleteAction(input);
}
