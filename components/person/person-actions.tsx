"use client";

import { Focus, Route } from "lucide-react";
import type { PersonId } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import { useMap } from "@/components/map/map-context";
import { personPath } from "@/lib/site";

export function PersonActions({ personId, name }: { personId: PersonId; name: string }) {
  const { focusMode, setFocusMode, openPathTool } = useMap();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" pressed={focusMode} onClick={() => setFocusMode(!focusMode)}>
        <Focus className="size-3.5" />
        {focusMode ? "Pokaż cały graf" : "Skup się na tej osobie"}
      </Button>
      <Button size="sm" onClick={() => openPathTool(personId)} aria-label={`Znajdź ścieżkę od ${name}`}>
        <Route className="size-3.5" />
        Ścieżka
      </Button>
      <ShareButton path={personPath(personId)} title={`Czechowickie Żule — ${name}`} text={`Poznaj: ${name}`} />
    </div>
  );
}
