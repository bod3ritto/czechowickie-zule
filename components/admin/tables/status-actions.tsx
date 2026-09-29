"use client";

import { Archive, CircleCheck, FilePen } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DropdownMenuItem } from "@/components/admin/ui/dropdown-menu";
import type { Status } from "@/lib/db/enums";

/** "Opublikuj" / "Przenieś do wersji roboczej" / "Archiwizuj" as menu items. */
export function StatusMenuItems({ status, onChange }: { status: Status; onChange(status: Status): void }) {
  return (
    <>
      {status !== "published" && (
        <DropdownMenuItem onSelect={() => onChange("published")}>
          <CircleCheck /> Opublikuj
        </DropdownMenuItem>
      )}
      {status !== "draft" && (
        <DropdownMenuItem onSelect={() => onChange("draft")}>
          <FilePen /> Przenieś do wersji roboczej
        </DropdownMenuItem>
      )}
      {status !== "archived" && (
        <DropdownMenuItem onSelect={() => onChange("archived")}>
          <Archive /> Archiwizuj
        </DropdownMenuItem>
      )}
    </>
  );
}

/** Same actions as buttons, for the bulk bar. */
export function BulkStatusButtons({ onChange }: { onChange(status: Status): void }) {
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => onChange("published")}>
        <CircleCheck /> Opublikuj
      </Button>
      <Button size="sm" variant="outline" onClick={() => onChange("draft")}>
        <FilePen /> Do wersji roboczej
      </Button>
      <Button size="sm" variant="outline" onClick={() => onChange("archived")}>
        <Archive /> Archiwizuj
      </Button>
    </>
  );
}
