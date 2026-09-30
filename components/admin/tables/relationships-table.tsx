"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/admin/common/data-table";
import { EmptyState } from "@/components/admin/common/layout";
import { ConfidenceBadge, StatusBadge, StrengthMeter } from "@/components/admin/common/badges";
import { AdminAvatar } from "@/components/admin/common/person-picker";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useCanDelete } from "@/components/admin/providers/admin-data";
import { useQuickAdd } from "@/components/admin/shell/quick-add";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { useOptimisticStatus } from "@/components/admin/hooks/use-optimistic-status";
import { deleteRelationships, setRelationshipsStatus, setRelationshipsType } from "@/lib/actions/relationships";
import { CONFIDENCE_LABEL, RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { CONFIDENCE_VALUES, RELATIONSHIP_TYPE_VALUES, STATUS_LABEL, STATUS_VALUES } from "@/lib/db/enums";
import type { RelationshipRow } from "@/lib/db/database.types";
import { BulkStatusButtons, StatusMenuItems } from "./status-actions";
import { previewHref } from "./people-table";

export function RelationshipsTable({ relationships }: { relationships: RelationshipRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const canDelete = useCanDelete();
  const quickAdd = useQuickAdd();
  const { run } = useServerAction();
  const { peopleById } = useAdminData();
  const [rows, setStatus] = useOptimisticStatus(relationships);
  const name = (id: string) => peopleById.get(id)?.name ?? "?";
  const since = (r: RelationshipRow) => r.since_year ?? (r.since_date ? Number(r.since_date.slice(0, 4)) : null);

  const person = (id: string) => {
    const p = peopleById.get(id);
    return p ? (
      <Link href={`/admin/people/${id}`} className="flex items-center gap-2 hover:underline">
        <AdminAvatar person={p} size="xs" />
        {p.name}
      </Link>
    ) : (
      "?"
    );
  };

  const askDelete = async (ids: string[]) => {
    const ok = await confirm({
      title: ids.length > 1 ? `Usunąć ${ids.length} relacje?` : "Usunąć relację?",
      description: "Tego nie da się cofnąć. Powiązane wydarzenia zostaną, ale stracą link do tej relacji.",
      confirmLabel: "Usuń",
      destructive: true,
      requireText: ids.length > 1 ? "USUŃ" : undefined,
    });
    if (ok) await run(() => deleteRelationships({ ids }));
    return ok;
  };

  const columns: Column<RelationshipRow>[] = [
    { key: "a", header: "Osoba A", sortValue: (r) => name(r.person_a), cell: (r) => person(r.person_a) },
    {
      key: "type",
      header: "Typ",
      sortValue: (r) => RELATIONSHIP_TYPES[r.type].label,
      cell: (r) => (
        <Link href={`/admin/relationships/${r.id}`} className="text-sm hover:underline" style={{ color: RELATIONSHIP_TYPES[r.type].color }}>
          {RELATIONSHIP_TYPES[r.type].label.toLowerCase()}
        </Link>
      ),
    },
    { key: "b", header: "Osoba B", sortValue: (r) => name(r.person_b), cell: (r) => person(r.person_b) },
    { key: "since", header: "Od", sortValue: (r) => since(r) ?? 0, cell: (r) => since(r) ?? <span className="text-muted-foreground">—</span> },
    { key: "strength", header: "Siła", sortValue: (r) => r.strength, cell: (r) => <StrengthMeter value={r.strength} color={RELATIONSHIP_TYPES[r.type].color} /> },
    { key: "confidence", header: "Pewność", sortValue: (r) => r.confidence, cell: (r) => <ConfidenceBadge confidence={r.confidence} /> },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getId={(r) => r.id}
      searchText={(r) => `${name(r.person_a)} ${name(r.person_b)} ${peopleById.get(r.person_a)?.nickname ?? ""} ${peopleById.get(r.person_b)?.nickname ?? ""} ${RELATIONSHIP_TYPES[r.type].label} ${r.description} ${r.slug}`}
      searchPlaceholder="Osoba, typ, opis…"
      initialSort={{ key: "a", dir: "asc" }}
      onRowClick={(r) => router.push(`/admin/relationships/${r.id}`)}
      filters={[
        { key: "type", label: "Typ", options: RELATIONSHIP_TYPE_VALUES.map((t) => ({ value: t, label: RELATIONSHIP_TYPES[t].label })), predicate: (r, v) => r.type === v },
        { key: "status", label: "Status", options: STATUS_VALUES.map((s) => ({ value: s, label: STATUS_LABEL[s] })), predicate: (r, v) => r.status === v },
        { key: "confidence", label: "Pewność", options: CONFIDENCE_VALUES.map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] })), predicate: (r, v) => r.confidence === v },
      ]}
      bulkActions={(ids, clear) => (
        <>
          <BulkStatusButtons onChange={(status) => void setStatus(ids, status, setRelationshipsStatus).then((ok) => ok && clear())} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Tags /> Zmień typ
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 overflow-y-auto">
              {RELATIONSHIP_TYPE_VALUES.map((t) => (
                <DropdownMenuItem key={t} onSelect={() => void run(() => setRelationshipsType({ ids, type: t }), { onSuccess: clear })}>
                  <span className="size-2 rounded-full" style={{ background: RELATIONSHIP_TYPES[t].color }} />
                  {RELATIONSHIP_TYPES[t].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canDelete && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => void askDelete(ids).then((ok) => ok && clear())}>
              <Trash2 /> Usuń
            </Button>
          )}
        </>
      )}
      rowActions={(r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Akcje relacji">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/relationships/${r.id}`}>
                <Pencil /> Edytuj
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={previewHref(`/relacja/${r.slug}`)} target="_blank" rel="noreferrer">
                <ExternalLink /> Podgląd
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <StatusMenuItems status={r.status} onChange={(status) => void setStatus([r.id], status, setRelationshipsStatus)} />
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void askDelete([r.id])}>
                  <Trash2 /> Usuń
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      mobileCard={(r) => (
        <Link href={`/admin/relationships/${r.id}`} className="grid gap-1">
          <span className="text-sm font-medium">
            {name(r.person_a)} <span className="text-muted-foreground">↔</span> {name(r.person_b)}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span style={{ color: RELATIONSHIP_TYPES[r.type].color }}>{RELATIONSHIP_TYPES[r.type].label}</span>
            {since(r) && <span className="text-muted-foreground">od {since(r)}</span>}
            <StatusBadge status={r.status} />
          </span>
        </Link>
      )}
      empty={
        <EmptyState
          icon={<Link2 />}
          title="Brak relacji"
          description="Połącz dwie osoby, żeby pojawiły się na grafie."
          action={
            <Button onClick={() => quickAdd({ kind: "relationship" })}>
              <Plus /> Dodaj relację
            </Button>
          }
        />
      }
    />
  );
}
