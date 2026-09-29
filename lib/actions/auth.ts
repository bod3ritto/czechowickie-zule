"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/policy";

const signInSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail."),
  password: z.string().min(1, "Podaj hasło."),
  next: z.string().optional(),
});

export interface SignInState {
  error?: string;
}

/** Email + password login. Non-admin accounts are signed out immediately. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  if (!isSupabaseConfigured()) return { error: "Supabase nie jest skonfigurowany (brak zmiennych środowiskowych)." };

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: "Nieprawidłowy e-mail lub hasło." };

  const { data: adminRow } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!adminRow) {
    await supabase.auth.signOut();
    return { error: "To konto nie ma uprawnień administratora." };
  }

  redirect(safeRedirectPath(parsed.data.next));
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
