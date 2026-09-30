"use client";

import { Flag } from "lucide-react";
import type { RelationshipId } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { useMap } from "@/components/map/map-context";

/** "Zgłoś zmianę" for a relationship (the panel itself is a server component). */
export function RelationshipChangeRequestButton({ relationshipId }: { relationshipId: RelationshipId }) {
  const { canSubmit, openChangeRequest } = useMap();
  if (!canSubmit) return null;
  return (
    <Button size="sm" onClick={() => openChangeRequest({ kind: "correction", relationship: relationshipId })} title="Ta relacja się nie zgadza?">
      <Flag className="size-3.5" />
      Zgłoś zmianę
    </Button>
  );
}
