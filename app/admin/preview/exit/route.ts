import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/auth/policy";

export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  redirect(safeRedirectPath(request.nextUrl.searchParams.get("path"), "/"));
}
