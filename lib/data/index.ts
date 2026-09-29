import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import type { Dataset } from "@/types/domain";
import { buildGraphIndex, type GraphIndex } from "@/lib/graph/model";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdmin } from "@/lib/auth/admin";
import { staticDataSource, type DataSource } from "./source";
import { supabaseDataSource } from "./supabase-source";
import { validateDataset } from "./validate";

/** Supabase when configured, otherwise the fictional data/*.ts files. */
function source(): DataSource {
  return isSupabaseConfigured() ? supabaseDataSource : staticDataSource;
}

async function load(preview: boolean): Promise<Dataset> {
  const dataset = await source().load({ preview });
  const errors = validateDataset(dataset);
  if (errors.length > 0) {
    // Static data: fail the build loudly. Database data: RLS may hide one end
    // of a link; log and continue with what's consistent.
    if (!isSupabaseConfigured()) throw new Error(`Błędy w danych:\n- ${errors.join("\n- ")}`);
    console.warn(`[data] ${errors.length} inconsistencies in dataset`, errors.slice(0, 5));
  }
  return dataset;
}

/**
 * Preview = Next.js draft mode (enabled via /admin/preview) AND a verified
 * admin session. Both are required; the cookie alone shows nothing extra.
 */
export const isPreview = cache(async (): Promise<boolean> => {
  try {
    const { isEnabled } = await draftMode();
    if (!isEnabled) return false;
  } catch {
    return false; // outside a request (build-time generateStaticParams)
  }
  return (await getAdmin()) !== null;
});

/** Published data only — safe for static generation, sitemaps, OG images. */
export const getPublishedDataset = cache(async (): Promise<Dataset> => load(false));

/** Request-aware: includes drafts for admins in preview mode. */
export const getDataset = cache(async (): Promise<Dataset> => ((await isPreview()) ? load(true) : getPublishedDataset()));

export const getGraphIndex = cache(async (): Promise<GraphIndex> => buildGraphIndex(await getDataset()));

export const getPublishedGraphIndex = cache(async (): Promise<GraphIndex> => buildGraphIndex(await getPublishedDataset()));
