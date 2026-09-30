"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";
import { StatusMenuItems } from "@/components/admin/tables/status-actions";
import { previewHref } from "@/components/admin/tables/people-table";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { deleteRelationships, setRelationshipsStatus } from "@/lib/actions/relationships";
import { deleteEvents, setEventsStatus } from "@/lib/actions/events";
import { deleteLore, setLoreStatus } from "@/lib/actions/lore";
import type { Status } from "@/lib/db/enums";
import { useCanDelete } from "@/components/admin/providers/admin-data";

const KINDS = {
  relationship: { setStatus: setRelationshipsStatus, remove: deleteRelationships, list: "/admin/relationships", title: "Usunąć relację?" },
  event: { setStatus: setEventsStatus, remove: deleteEvents, list: "/admin/events", title: "Usunąć wydarzenie?" },
  lore: { setStatus: setLoreStatus, remove: deleteLore, list: "/admin/lore", title: "Usunąć lore?" },
} as const;

/** Preview + publish/draft/archive + delete, for detail pages. */
export function EntityHeaderActions({
  kind,
  id,
  status,
  previewPath,
}: {
  kind: keyof typeof KINDS;
  id: string;
  status: Status;
  previewPath?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const canDelete = useCanDelete();
  const { run } = useServerAction();
  const k = KINDS[kind];
  return (
    <>
      {previewPath && (
        <Button asChild variant="outline" size="sm">
          <a href={previewHref(previewPath)} target="_blank" rel="noreferrer">
            <ExternalLink /> Podgląd
          </a>
        </Button>
      )}
      {status !== "published" && (
        <Button size="sm" onClick={() => void run(() => k.setStatus({ ids: [id], status: "published" }))}>
          Opublikuj
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Więcej akcji">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <StatusMenuItems status={status} onChange={(s) => void run(() => k.setStatus({ ids: [id], status: s }))} />
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  const ok = await confirm({ title: k.title, description: "Tego nie da się cofnąć. Rozważ archiwizację.", confirmLabel: "Usuń", destructive: true });
                  if (ok) await run(() => k.remove({ ids: [id] }), { onSuccess: () => router.push(k.list) });
                }}
              >
                <Trash2 /> Usuń
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
