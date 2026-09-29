"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Błąd</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Coś poszło nie tak.</h1>
        <p className="mt-3 text-fg-muted">Mapa się rozsypała. Spróbuj jeszcze raz.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="solid" onClick={reset}>Spróbuj ponownie</Button>
          <Link href="/" className={buttonClass("outline", "md")}>Strona główna</Link>
        </div>
      </div>
    </main>
  );
}
