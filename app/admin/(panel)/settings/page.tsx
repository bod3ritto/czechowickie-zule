import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseUrl } from "@/lib/env";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { ImportExport } from "@/components/admin/settings/import-export";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <AdminPageHeader title="Ustawienia" />
      <Section title="Konto">
        <dl className="grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Zalogowano jako</dt>
          <dd>{admin.email}</dd>
          <dt className="text-muted-foreground">Projekt Supabase</dt>
          <dd className="truncate font-mono text-xs">{supabaseUrl}</dd>
          <dt className="text-muted-foreground">Podgląd (preview)</dt>
          <dd>
            <a href="/admin/preview/exit?path=/admin/settings" className="underline underline-offset-2">
              Wyłącz tryb podglądu w tej przeglądarce
            </a>
          </dd>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Nowego administratora dodasz w Supabase: utwórz użytkownika w Auth, a potem dodaj jego id do tabeli <code className="font-mono">admin_users</code> (instrukcja w README).
        </p>
      </Section>
      <ImportExport />
    </div>
  );
}
