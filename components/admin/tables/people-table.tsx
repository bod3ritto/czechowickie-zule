"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Plus, Tags, Trash2, Users } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/admin/common/data-table";
import { EmptyState, formatDate } from "@/components/admin/common/layout";
import { StatusBadge } from "@/components/admin/common/badges";
import { PersonAvatar } from "@/components/person/person-avatar";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useQuickAdd } from "@/components/admin/shell/quick-add";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { useOptimisticStatus } from "@/components/admin/hooks/use-optimistic-status";
import { deletePeople, duplicatePerson, setPeopleCategory, setPeopleStatus } from "@/lib/actions/people";
import type { PersonListItem } from "@/lib/queries/admin";
import { PERSON_CATEGORIES } from "@/lib/relationship-types";
import { PERSON_CATEGORY_VALUES, STATUS_LABEL, STATUS_VALUES } from "@/lib/db/enums";
import { countLabel } from "@/lib/format";
import { StatusMenuItems, BulkStatusButtons } from "./status-actions";

export function previewHref(path: string) {
  return `/admin/preview?path=${encodeURIComponent(path)}`;
}

export function PeopleTable({ people }: { people: PersonListItem[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const quickAdd = useQuickAdd();
  const { run } = useServerAction();
  const [rows, setStatus] = useOptimisticStatus(people);

  const askDelete = async (targets: PersonListItem[]) => {
    const relations = targets.reduce((n, p) => n + p.relationshipCount, 0);
    const events = targets.reduce((n, p) => n + p.eventCount, 0);
    const single = targets.length === 1 ? targets[0] : null;
    const ok = await confirm({
      title: single ? `Czy na pewno chcesz usunąć: ${single.first_name}?` : `Usunąć ${targets.length} osoby?`,
      description: "Usunięcie jest nieodwracalne. Razem z osobą znikną jej relacje i zdjęcia. Zamiast tego możesz ją zarchiwizować.",
      warning:
        relations + events > 0
          ? `${single ? "Ta osoba ma" : "Te osoby mają"} ${countLabel(relations, "relację", "relacje", "relacji")} i ${countLabel(events, "wydarzenie", "wydarzenia", "wydarzeń")}.`
          : undefined,
      confirmLabel: "Usuń trwale",
      destructive: true,
      // Deleting several people at once needs an explicit, typed confirmation.
      requireText: targets.length > 1 ? "USUŃ" : undefined,
    });
    if (!ok) return false;
    const result = await run(() => deletePeople({ ids: targets.map((t) => t.id) }));
    return result.ok;
  };

  const columns: Column<PersonListItem>[] = [
    {
      key: "avatar",
      header: <span className="sr-only">Avatar</span>,
      className: "w-12",
      cell: (p) => <PersonAvatar person={{ name: p.first_name, category: p.category, avatarUrl: p.avatarUrl ?? undefined }} size="sm" />,
    },
    {
      key: "name",
      header: "Imię",
      sortValue: (p) => `${p.first_name} ${p.last_name ?? ""}`,
      cell: (p) => (
        <Link href={`/admin/people/${p.id}`} className="font-medium hover:underline">
          {p.first_name} {p.last_name && <span className="text-muted-foreground">{p.last_name}</span>}
        </Link>
      ),
    },
    { key: "nickname", header: "Ksywka", sortValue: (p) => p.nickname ?? "", cell: (p) => p.nickname ?? <span className="text-muted-foreground">—</span> },
    { key: "relations", header: "Relacje", sortValue: (p) => p.relationshipCount, className: "tabular-nums", cell: (p) => p.relationshipCount },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
    { key: "created", header: "Utworzono", sortValue: (p) => p.created_at, cell: (p) => <span className="text-muted-foreground">{formatDate(p.created_at)}</span> },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getId={(p) => p.id}
      searchText={(p) => [p.first_name, p.last_name, p.nickname, p.slug, p.bio, ...p.aliases].filter(Boolean).join(" ")}
      searchPlaceholder="Imię, nazwisko, ksywka, slug, opis…"
      initialSort={{ key: "created", dir: "desc" }}
      onRowClick={(p) => router.push(`/admin/people/${p.id}`)}
      filters={[
        { key: "status", label: "Status", options: STATUS_VALUES.map((s) => ({ value: s, label: STATUS_LABEL[s] })), predicate: (p, v) => p.status === v },
        {
          key: "category",
          label: "Kategoria",
          options: PERSON_CATEGORY_VALUES.map((c) => ({ value: c, label: PERSON_CATEGORIES[c].label })),
          predicate: (p, v) => p.category === v,
        },
      ]}
      bulkActions={(ids, clear) => (
        <>
          <BulkStatusButtons onChange={(status) => void setStatus(ids, status, setPeopleStatus).then((ok) => ok && clear())} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Tags /> Zmień kategorię
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PERSON_CATEGORY_VALUES.map((c) => (
                <DropdownMenuItem key={c} onSelect={() => void run(() => setPeopleCategory({ ids, category: c }), { onSuccess: clear })}>
                  {PERSON_CATEGORIES[c].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => void askDelete(rows.filter((r) => ids.includes(r.id))).then((ok) => ok && clear())}>
            <Trash2 /> Usuń
          </Button>
        </>
      )}
      rowActions={(p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Akcje: ${p.first_name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/people/${p.id}`}>
                <Pencil /> Edytuj
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={previewHref(`/osoba/${p.slug}`)} target="_blank" rel="noreferrer">
                <ExternalLink /> Podgląd
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void run(() => duplicatePerson({ id: p.id }), { onSuccess: (d) => router.push(`/admin/people/${d.id}`) })}
            >
              <Copy /> Duplikuj
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <StatusMenuItems status={p.status} onChange={(status) => void setStatus([p.id], status, setPeopleStatus)} />
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => void askDelete([p])}>
              <Trash2 /> Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      mobileCard={(p) => (
        <Link href={`/admin/people/${p.id}`} className="flex items-center gap-3">
          <PersonAvatar person={{ name: p.first_name, category: p.category, avatarUrl: p.avatarUrl ?? undefined }} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {p.first_name} {p.nickname && p.nickname !== p.first_name && <span className="text-muted-foreground">„{p.nickname}”</span>}
            </span>
            <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status={p.status} /> {countLabel(p.relationshipCount, "relacja", "relacje", "relacji")}
            </span>
          </span>
        </Link>
      )}
      empty={
        <EmptyState
          icon={<Users />}
          title="Na mapie nie ma jeszcze nikogo"
          description="Dodaj pierwszą osobę — potem połącz ją relacjami z innymi."
          action={
            <Button onClick={() => quickAdd({ kind: "person" })}>
              <Plus /> Dodaj osobę
            </Button>
          }
        />
      }
    />
  );
}
