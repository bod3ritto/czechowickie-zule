"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/admin/common/data-table";
import { EmptyState } from "@/components/admin/common/layout";
import { ConfidenceBadge, StatusBadge } from "@/components/admin/common/badges";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useCanDelete } from "@/components/admin/providers/admin-data";
import { useQuickAdd } from "@/components/admin/shell/quick-add";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { useOptimisticStatus } from "@/components/admin/hooks/use-optimistic-status";
import { deleteLore, setLoreStatus } from "@/lib/actions/lore";
import { CONFIDENCE_LABEL, LORE_TYPE_LABEL } from "@/lib/relationship-types";
import { CONFIDENCE_VALUES, LORE_TYPE_VALUES, STATUS_LABEL, STATUS_VALUES } from "@/lib/db/enums";
import type { LoreListItem } from "@/lib/queries/admin";
import { BulkStatusButtons, StatusMenuItems } from "./status-actions";

export function LoreTable({ lore }: { lore: LoreListItem[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const canDelete = useCanDelete();
  const quickAdd = useQuickAdd();
  const { run } = useServerAction();
  const { peopleById } = useAdminData();
  const [rows, setStatus] = useOptimisticStatus(lore);
  const names = (ids: string[]) => ids.map((id) => peopleById.get(id)?.name ?? "?").join(", ");

  const askDelete = async (ids: string[]) => {
    const ok = await confirm({
      title: ids.length > 1 ? `Usunąć ${ids.length} wpisy lore?` : "Usunąć lore?",
      description: "Tego nie da się cofnąć.",
      confirmLabel: "Usuń",
      destructive: true,
      requireText: ids.length > 1 ? "USUŃ" : undefined,
    });
    if (ok) await run(() => deleteLore({ ids }));
    return ok;
  };

  const columns: Column<LoreListItem>[] = [
    {
      key: "content",
      header: "Treść",
      sortValue: (l) => l.title ?? l.content,
      className: "max-w-md",
      cell: (l) => (
        <Link href={`/admin/lore/${l.id}`} className="block hover:underline">
          {l.title && <span className="block font-medium">{l.title}</span>}
          <span className="line-clamp-2 text-muted-foreground">{l.content}</span>
        </Link>
      ),
    },
    { key: "type", header: "Typ", sortValue: (l) => l.lore_type, cell: (l) => LORE_TYPE_LABEL[l.lore_type] },
    { key: "people", header: "Osoby", sortValue: (l) => names(l.people), cell: (l) => <span className="text-sm">{names(l.people) || "—"}</span> },
    { key: "year", header: "Rok", sortValue: (l) => l.year ?? 0, cell: (l) => l.year ?? <span className="text-muted-foreground">—</span> },
    { key: "confidence", header: "Pewność", sortValue: (l) => l.confidence, cell: (l) => <ConfidenceBadge confidence={l.confidence} /> },
    { key: "status", header: "Publikacja", sortValue: (l) => l.status, cell: (l) => <StatusBadge status={l.status} /> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getId={(l) => l.id}
      searchText={(l) => `${l.title ?? ""} ${l.content} ${names(l.people)}`}
      searchPlaceholder="Treść, tytuł, osoba…"
      initialSort={{ key: "year", dir: "desc" }}
      onRowClick={(l) => router.push(`/admin/lore/${l.id}`)}
      filters={[
        { key: "type", label: "Typ", options: LORE_TYPE_VALUES.map((t) => ({ value: t, label: LORE_TYPE_LABEL[t] })), predicate: (l, v) => l.lore_type === v },
        { key: "confidence", label: "Pewność", options: CONFIDENCE_VALUES.map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] })), predicate: (l, v) => l.confidence === v },
        { key: "status", label: "Publikacja", options: STATUS_VALUES.map((s) => ({ value: s, label: STATUS_LABEL[s] })), predicate: (l, v) => l.status === v },
      ]}
      bulkActions={(ids, clear) => (
        <>
          <BulkStatusButtons onChange={(status) => void setStatus(ids, status, setLoreStatus).then((ok) => ok && clear())} />
          {canDelete && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => void askDelete(ids).then((ok) => ok && clear())}>
              <Trash2 /> Usuń
            </Button>
          )}
        </>
      )}
      rowActions={(l) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Akcje lore">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/lore/${l.id}`}>
                <Pencil /> Edytuj
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <StatusMenuItems status={l.status} onChange={(status) => void setStatus([l.id], status, setLoreStatus)} />
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void askDelete([l.id])}>
                  <Trash2 /> Usuń
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      mobileCard={(l) => (
        <Link href={`/admin/lore/${l.id}`} className="grid gap-1">
          {l.title && <span className="text-sm font-medium">{l.title}</span>}
          <span className="line-clamp-2 text-sm text-muted-foreground">{l.content}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            {LORE_TYPE_LABEL[l.lore_type]} <ConfidenceBadge confidence={l.confidence} /> <StatusBadge status={l.status} />
          </span>
        </Link>
      )}
      empty={
        <EmptyState
          icon={<BookOpen />}
          title="Brak lore"
          description="Historie, cytaty, legendy i plotki — z jasnym oznaczeniem, co jest pewne, a co nie."
          action={
            <Button onClick={() => quickAdd({ kind: "lore" })}>
              <Plus /> Dodaj lore
            </Button>
          }
        />
      }
    />
  );
}
