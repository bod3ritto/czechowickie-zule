import "server-only";
import { mediaPublicUrl } from "@/lib/env";
import { createPublicClient, createSessionClient } from "@/lib/supabase/server";
import { datasetSchema, toDataset } from "./public-dataset-schema";
import type { DataSource } from "./source";

/**
 * Loads the public dataset with a single RPC. Normal visitors use the
 * anonymous client (RLS: published only); preview uses the admin's session
 * so drafts are included.
 */
export const supabaseDataSource: DataSource = {
  async load({ preview = false } = {}) {
    const client = preview ? await createSessionClient() : createPublicClient();
    const { data, error } = await client.rpc("public_dataset", { include_drafts: preview });
    if (error) {
      console.error("[data] public_dataset failed:", error.message);
      throw new Error("Nie udało się pobrać danych mapy.");
    }
    return toDataset(datasetSchema.parse(data), mediaPublicUrl);
  },
};
