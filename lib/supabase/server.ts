import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Request-scoped client carrying the admin's session cookie. Every query
 * runs as that user, so RLS (`is_admin()`) is enforced by Postgres.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session on the next request instead.
        }
      },
    },
  });
}

/** Cookie-less anonymous client for public reads (cacheable, sees published data only). */
export function createPublicClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
