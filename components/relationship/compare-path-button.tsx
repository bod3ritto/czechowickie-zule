"use client";

import { Route } from "lucide-react";
import type { PersonId } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { useMap } from "@/components/map/map-context";

export function ComparePathButton({ from, to }: { from: PersonId; to: PersonId }) {
  const { openPathTool } = useMap();
  return (
    <Button size="sm" onClick={() => openPathTool(from, to)}>
      <Route className="size-3.5" />
      Ścieżka i wspólni znajomi
    </Button>
  );
}
