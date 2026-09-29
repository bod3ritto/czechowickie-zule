import type { Dataset } from "@/types/domain";
import { loadStaticDataset } from "./static-source";

export interface LoadOptions {
  /** Include drafts (admin preview). Ignored by sources without drafts. */
  preview?: boolean;
}

/**
 * Anything that can deliver the public dataset. `lib/data/supabase-source.ts`
 * reads Supabase; this one reads the fictional `data/*.ts` files and is used
 * when Supabase isn't configured (local dev without a database, first deploy).
 */
export interface DataSource {
  load(options?: LoadOptions): Promise<Dataset>;
}

export const staticDataSource: DataSource = {
  async load() {
    return loadStaticDataset();
  },
};
