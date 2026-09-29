"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { useQuickAdd } from "@/components/admin/shell/quick-add";

export function QuickActions() {
  const quickAdd = useQuickAdd();
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => quickAdd({ kind: "person" })}>
        <Plus /> Dodaj osobę
      </Button>
      <Button size="sm" variant="outline" onClick={() => quickAdd({ kind: "relationship" })}>
        <Plus /> Dodaj relację
      </Button>
      <Button size="sm" variant="outline" onClick={() => quickAdd({ kind: "event" })}>
        <Plus /> Dodaj wydarzenie
      </Button>
      <Button size="sm" variant="outline" onClick={() => quickAdd({ kind: "lore" })}>
        <Plus /> Dodaj lore
      </Button>
    </>
  );
}
