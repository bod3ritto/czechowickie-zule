import Link from "next/link";
import { Logo } from "@/components/ui/logo";

/** Shown instead of the panel until Supabase env variables are set. */
export function SetupNotice() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-lg">
        <Logo className="size-9" />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Panel wymaga Supabase</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Publiczna strona działa teraz na przykładowych danych z plików <code className="font-mono">data/*.ts</code>. Żeby
          włączyć panel administracyjny:
        </p>
        <ol className="mt-5 grid gap-3 text-sm">
          {[
            <>Utwórz projekt na supabase.com.</>,
            <>
              Uruchom migracje z <code className="font-mono">supabase/migrations</code> i (opcjonalnie) <code className="font-mono">supabase/seed.sql</code>.
            </>,
            <>
              Ustaw <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> i <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> w{" "}
              <code className="font-mono">.env.local</code> (lokalnie) albo w Vercel.
            </>,
            <>
              Utwórz użytkownika w Supabase Auth i dodaj go do tabeli <code className="font-mono">admin_users</code>.
            </>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 rounded-lg border bg-card p-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[11px]">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-muted-foreground">
          Szczegóły krok po kroku są w <code className="font-mono">README.md</code>.{" "}
          <Link href="/" className="underline underline-offset-2">
            Wróć na mapę
          </Link>
        </p>
      </div>
    </main>
  );
}
