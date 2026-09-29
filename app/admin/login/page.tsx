import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdmin } from "@/lib/auth/admin";
import { safeRedirectPath } from "@/lib/auth/policy";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "@/components/admin/login-form";
import { SetupNotice } from "@/components/admin/setup-notice";

export const metadata: Metadata = { title: "Logowanie" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  if (await getAdmin()) redirect(next);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo className="size-8" />
          <div>
            <p className="text-sm font-semibold tracking-tight">Czechowickie Żule</p>
            <p className="text-xs text-muted-foreground">Panel administracyjny</p>
          </div>
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Zaloguj się</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dostęp tylko dla administratorów.</p>
        {params.error === "forbidden" && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-200" role="alert">
            To konto nie ma uprawnień administratora.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
