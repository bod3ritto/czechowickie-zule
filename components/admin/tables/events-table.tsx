"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/admin/common/data-table";
import { EmptyState } from "@/components/admin/common/layout";
import { ConfidenceBadge, StatusBadge } from "@/components/admin/common/badges";
import { AdminAvatar } from "@/components/admin/common/person-picker";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useCanDelete } from "@/components/admin/providers/admin-data";
import { useQuickAdd } from "@/components/admin/shell/quick-add";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { useOptimisticStatus } from "@/components/admin/hooks/use-optimistic-status";
import { deleteEvents, setEventsStatus } from "@/lib/actions/events";
import { CONFIDENCE_LABEL } from "@/lib/relationship-types";
import { CONFIDENCE_VALUES, STATUS_LABEL, STATUS_VALUES } from "@/lib/db/enums";
import type { EventListItem } from "@/lib/queries/admin";
import { BulkStatusButtons, StatusMenuItems } from "./status-actions";

export function EventsTable({ events }: { events: EventListItem[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const canDelete = useCanDelete();
  const quickAdd = useQuickAdd();
  const { run } = useServerAction();
  const { peopleById } = useAdminData();
  const [rows, setStatus] = useOptimisticStatus(events);

  const askDelete = async (ids: string[]) => {
    const ok = await confirm({
      title: ids.length > 1 ? `Usunąć ${ids.length} wydarzenia?` : "Usunąć wydarzenie?",
      description: "Tego nie da się cofnąć. Zdjęcia wydarzenia też zostaną usunięte.",
      confirmLabel: "Usuń",
      destructive: true,
      requireText: ids.length > 1 ? "USUŃ" : undefined,
    });
    if (ok) await run(() => deleteEvents({ ids }));
    return ok;
  };

  const date = (e: EventListItem) => e.event_date ?? (e.year ? String(e.year) : null);

  const columns: Column<EventListItem>[] = [
    {
      key: "title",
      header: "Tytuł",
      sortValue: (e) => e.title,
      cell: (e) => (
        <Link href={`/admin/events/${e.id}`} className="font-medium hover:underline">
          {e.title}
        </Link>
      ),
    },
    { key: "date", header: "Data", sortValue: (e) => date(e) ?? "9999", cell: (e) => date(e) ?? <span className="text-muted-foreground">—</span> },
    {
      key: "people",
      header: "Osoby",
      sortValue: (e) => e.people.length,
      cell: (e) => (
        <span className="flex items-center -space-x-1.5">
          {e.people.slice(0, 5).map((id) => {
            const p = peopleById.get(id);
            return p ? <AdminAvatar key={id} person={p} size="xs" /> : null;
          })}
          {e.people.length > 5 && <span className="pl-3 text-xs text-muted-foreground">+{e.people.length - 5}</span>}
        </span>
      ),
    },
    { key: "confidence", header: "Pewność", sortValue: (e) => e.confidence, cell: (e) => <ConfidenceBadge confidence={e.confidence} /> },
    { key: "status", header: "Status", sortValue: (e) => e.status, cell: (e) => <StatusBadge status={e.status} /> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getId={(e) => e.id}
      searchText={(e) => `${e.title} ${e.description ?? ""} ${e.year ?? ""} ${e.people.map((id) => peopleById.get(id)?.name ?? "").join(" ")}`}
      searchPlaceholder="Tytuł, opis, rok, osoba…"
      initialSort={{ key: "date", dir: "desc" }}
      onRowClick={(e) => router.push(`/admin/events/${e.id}`)}
      filters={[
        { key: "status", label: "Status", options: STATUS_VALUES.map((s) => ({ value: s, label: STATUS_LABEL[s] })), predicate: (e, v) => e.status === v },
        { key: "confidence", label: "Pewność", options: CONFIDENCE_VALUES.map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] })), predicate: (e, v) => e.confidence === v },
      ]}
      bulkActions={(ids, clear) => (
        <>
          <BulkStatusButtons onChange={(status) => void setStatus(ids, status, setEventsStatus).then((ok) => ok && clear())} />
          {canDelete && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => void askDelete(ids).then((ok) => ok && clear())}>
              <Trash2 /> Usuń
            </Button>
          )}
        </>
      )}
      rowActions={(e) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Akcje: ${e.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/events/${e.id}`}>
                <Pencil /> Edytuj
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <StatusMenuItems status={e.status} onChange={(status) => void setStatus([e.id], status, setEventsStatus)} />
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void askDelete([e.id])}>
                  <Trash2 /> Usuń
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      mobileCard={(e) => (
        <Link href={`/admin/events/${e.id}`} className="grid gap-1">
          <span className="text-sm font-medium">{e.title}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {date(e) ?? "bez daty"} · {e.people.length} os. <StatusBadge status={e.status} />
          </span>
        </Link>
      )}
      empty={
        <EmptyState
          icon={<CalendarDays />}
          title="Brak wydarzeń"
          description="Wydarzenia budują oś czasu osób i historię relacji."
          action={
            <Button onClick={() => quickAdd({ kind: "event" })}>
              <Plus /> Dodaj wydarzenie
            </Button>
          }
        />
      }
    />
  );
}
