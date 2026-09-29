"use client";

import { useState } from "react";
import { MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/admin/common/data-table";
import { EmptyState } from "@/components/admin/common/layout";
import { LocationForm } from "@/components/admin/forms/location-form";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { deleteLocations } from "@/lib/actions/locations";
import type { LocationRow } from "@/lib/db/database.types";

export function LocationsManager({ locations, usage }: { locations: LocationRow[]; usage: Record<string, number> }) {
  const confirm = useConfirm();
  const { run } = useServerAction();
  const [editing, setEditing] = useState<LocationRow | "new" | null>(null);

  const remove = async (l: LocationRow) => {
    const used = usage[l.id] ?? 0;
    const ok = await confirm({
      title: `Usunąć lokalizację „${l.name}”?`,
      description: "Osoby, relacje i wydarzenia stracą przypisanie do tego miejsca (same nie zostaną usunięte).",
      warning: used ? `To miejsce jest używane w ${used} wpisach.` : undefined,
      confirmLabel: "Usuń",
      destructive: true,
    });
    if (ok) await run(() => deleteLocations({ ids: [l.id] }));
  };

  const columns: Column<LocationRow>[] = [
    { key: "name", header: "Nazwa", sortValue: (l) => l.name, cell: (l) => <span className="font-medium">{l.name}</span> },
    { key: "address", header: "Adres / opis", cell: (l) => <span className="text-muted-foreground">{l.address || l.description || "—"}</span> },
    {
      key: "coords",
      header: "Współrzędne",
      cell: (l) =>
        l.lat != null && l.lng != null ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=17/${l.lat}/${l.lng}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs hover:underline"
          >
            {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "usage", header: "Użycia", sortValue: (l) => usage[l.id] ?? 0, cell: (l) => usage[l.id] ?? 0 },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> Dodaj miejsce
        </Button>
      </div>
      <DataTable
        rows={locations}
        columns={columns}
        getId={(l) => l.id}
        searchText={(l) => `${l.name} ${l.address ?? ""} ${l.description ?? ""}`}
        searchPlaceholder="Szukaj miejsca…"
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(l) => setEditing(l)}
        rowActions={(l) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Akcje: ${l.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(l)}>
                <Pencil /> Edytuj
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => void remove(l)}>
                <Trash2 /> Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        mobileCard={(l) => (
          <button type="button" className="grid w-full gap-0.5 text-left" onClick={() => setEditing(l)}>
            <span className="font-medium">{l.name}</span>
            <span className="text-xs text-muted-foreground">{l.address || l.description || "—"}</span>
          </button>
        )}
        empty={
          <EmptyState
            icon={<MapPin />}
            title="Brak miejsc"
            description="Boisko, szkoła, sklep, ławka pod blokiem… Miejsca przypiszesz do relacji i wydarzeń."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Dodaj miejsce
              </Button>
            }
          />
        }
      />
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nowe miejsce" : "Edytuj miejsce"}</DialogTitle>
            <DialogDescription>Miejsca będą używane na przyszłej mapie geograficznej.</DialogDescription>
          </DialogHeader>
          {editing && <LocationForm key={editing === "new" ? "new" : editing.id} location={editing === "new" ? undefined : editing} onSaved={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
