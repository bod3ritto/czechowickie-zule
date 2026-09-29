/**
 * Pure authorization decision, separated from Supabase so it can be unit
 * tested. Being logged in is NOT enough: the user must be in admin_users.
 */
export type AccessDecision = "ok" | "unauthenticated" | "forbidden";

export function decideAdminAccess(user: { id: string } | null, isAdmin: boolean): AccessDecision {
  if (!user) return "unauthenticated";
  if (!isAdmin) return "forbidden";
  return "ok";
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeRedirectPath(next: string | null | undefined, fallback = "/admin"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
