"use client";

import { useEffect } from "react";
import { Button } from "@/components/admin/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto grid max-w-md gap-3 py-16 text-center">
      <h1 className="text-lg font-semibold">Nie udało się wczytać tej strony</h1>
      <p className="text-sm text-muted-foreground">Sprawdź połączenie z bazą danych i spróbuj ponownie.</p>
      <div>
        <Button onClick={reset}>Spróbuj ponownie</Button>
      </div>
    </div>
  );
}
