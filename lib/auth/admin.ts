import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { decideAdminAccess, type AccessDecision } from "./policy";

export interface AdminSession {
  userId: string;
  email: string;
}

/**
 * Server-side admin check, memoized per request. `getUser()` validates the
 * JWT with Supabase Auth (unlike `getSession()`, which trusts the cookie).
 */
export const checkAdmin = cache(async (): Promise<{ decision: AccessDecision; admin: AdminSession | null }> => {
  if (!isSupabaseConfigured()) return { decision: "unauthenticated", admin: null };
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { decision: "unauthenticated", admin: null };

  const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const decision = decideAdminAccess(user, Boolean(data));
  return { decision, admin: decision === "ok" ? { userId: user.id, email: user.email ?? "" } : null };
});

export async function getAdmin(): Promise<AdminSession | null> {
  return (await checkAdmin()).admin;
}

/** For pages/layouts: redirects to the login page unless the user is an admin. */
export async function requireAdmin(nextPath = "/admin"): Promise<AdminSession> {
  const { decision, admin } = await checkAdmin();
  if (decision === "ok" && admin) return admin;
  redirect(`/admin/login?next=${encodeURIComponent(nextPath)}${decision === "forbidden" ? "&error=forbidden" : ""}`);
}
