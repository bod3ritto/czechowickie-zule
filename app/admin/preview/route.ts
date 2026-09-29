import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { safeRedirectPath } from "@/lib/auth/policy";

/**
 * Enables preview (Next.js draft mode) for admins and opens the public page.
 * Drafts are only loaded when the draft-mode cookie AND an admin session are
 * both present (see lib/data/index.ts).
 */
export async function GET(request: NextRequest) {
  const path = safeRedirectPath(request.nextUrl.searchParams.get("path"), "/");
  if (!(await getAdmin())) redirect(`/admin/login?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`);
  (await draftMode()).enable();
  redirect(path);
}
