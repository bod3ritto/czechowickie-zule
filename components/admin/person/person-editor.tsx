"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import { Button } from "@/components/admin/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/admin/ui/dropdown-menu";
import { Section } from "@/components/admin/common/layout";
import { ConfidenceBadge, StatusBadge, StrengthMeter } from "@/components/admin/common/badges";
import { AdminAvatar } from "@/components/admin/common/person-picker";
import { PersonForm } from "@/components/admin/forms/person-form";
import { MediaManager } from "@/components/admin/media/media-manager";
import { StatusMenuItems } from "@/components/admin/tables/status-actions";
import { previewHref } from "@/components/admin/tables/people-table";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useNavigationGuard } from "@/components/admin/providers/unsaved-changes";
import { useQuickAdd } from "@/components/admin/shell/quick-add";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { deletePeople, setPeopleStatus } from "@/lib/actions/people";
import { RELATIONSHIP_TYPES, LORE_TYPE_LABEL } from "@/lib/relationship-types";
import { countLabel } from "@/lib/format";
import type { EventRow, LoreRow, PersonRow, RelationshipRow } from "@/lib/db/database.types";
import type { MediaItem } from "@/lib/queries/admin";
import { RelationshipOverview } from "./relationship-overview";
import { EventTimeline } from "./event-timeline";

const TABS = ["profil", "relacje", "wydarzenia", "lore", "media", "podglad"] as const;
type Tab = (typeof TABS)[number];

export function PersonEditor({
  person,
  relationships,
  events,
  lore,
  media,
}: {
  person: PersonRow;
  relationships: RelationshipRow[];
  events: EventRow[];
  lore: LoreRow[];
  media: MediaItem[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const quickAdd = useQuickAdd();
  const guard = useNavigationGuard();
  const { run } = useServerAction();
  const { peopleById } = useAdminData();
  const initialTab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "profil";
  const [tab, setTab] = useState<Tab>(initialTab);
  const self = peopleById.get(person.id);

  const oldest = relationships.reduce<number | null>((min, r) => {
    const y = r.since_year ?? (r.since_date ? Number(r.since_date.slice(0, 4)) : null);
    return y !== null && (min === null || y < min) ? y : min;
  }, null);
  const latestEvent = events.reduce<number | null>((max, e) => (e.year !== null && (max === null || e.year > max) ? e.year : max), null);

  const remove = async () => {
    const ok = await confirm({
      title: `Czy na pewno chcesz usunąć: ${person.first_name}?`,
      description: "To nieodwracalne. Znikną też relacje i zdjęcia tej osoby. Rozważ archiwizację — ukrywa osobę publicznie, ale zachowuje dane.",
      warning:
        relationships.length + events.length > 0
          ? `Ta osoba ma ${countLabel(relationships.length, "relację", "relacje", "relacji")} i ${countLabel(events.length, "wydarzenie", "wydarzenia", "wydarzeń")}.`
          : undefined,
      confirmLabel: "Usuń trwale",
      destructive: true,
    });
    if (ok) await run(() => deletePeople({ ids: [person.id] }), { onSuccess: () => router.push("/admin/people") });
  };

  const addRelationship = () =>
    quickAdd({ kind: "relationship", personA: person.id, lockPersonA: true, onSaved: () => router.refresh() });

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {self && <AdminAvatar person={self} size="lg" />}
        <div className="min-w-0 flex-1">
          <Link href="/admin/people" className="text-xs text-muted-foreground hover:underline">
            Osoby
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
            {person.first_name} {person.last_name}
            {person.nickname && <span className="font-normal text-muted-foreground">„{person.nickname}”</span>}
            <StatusBadge status={person.status} long />
          </h1>
          <p className="font-mono text-xs text-muted-foreground">/osoba/{person.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={previewHref(`/osoba/${person.slug}`)} target="_blank" rel="noreferrer">
              <ExternalLink /> Podgląd
            </a>
          </Button>
          {person.status !== "published" && (
            <Button size="sm" onClick={() => void run(() => setPeopleStatus({ ids: [person.id], status: "published" }))}>
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
              <StatusMenuItems status={person.status} onChange={(status) => void run(() => setPeopleStatus({ ids: [person.id], status }))} />
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void remove()}>
                <Trash2 /> Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as Tab);
          window.history.replaceState(null, "", `?tab=${v}`);
        }}
      >
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="profil">Profil</TabsTrigger>
            <TabsTrigger value="relacje">Relacje · {relationships.length}</TabsTrigger>
            <TabsTrigger value="wydarzenia">Wydarzenia · {events.length}</TabsTrigger>
            <TabsTrigger value="lore">Lore · {lore.length}</TabsTrigger>
            <TabsTrigger value="media">Media · {media.length}</TabsTrigger>
            <TabsTrigger value="podglad">Podgląd</TabsTrigger>
          </TabsList>
        </div>

        {/* forceMount keeps the profile form (and its unsaved edits) alive across tabs */}
        <TabsContent value="profil" forceMount className="mt-4 data-[state=inactive]:hidden">
          <PersonForm person={person} />
        </TabsContent>

        <TabsContent value="relacje" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <Section title="Przegląd">
              {self && <RelationshipOverview person={self} relationships={relationships} peopleById={peopleById} />}
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Relacje</dt>
                  <dd className="text-lg font-semibold">{relationships.length}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Najstarsza</dt>
                  <dd className="text-lg font-semibold">{oldest ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Ost. wydarzenie</dt>
                  <dd className="text-lg font-semibold">{latestEvent ?? "—"}</dd>
                </div>
              </dl>
            </Section>
            <Section
              title="Wszystkie relacje"
              actions={
                <Button size="sm" onClick={addRelationship}>
                  <Plus /> Dodaj relację
                </Button>
              }
            >
              {relationships.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak relacji. Dodaj pierwszą — osoba A jest już ustawiona.</p>
              ) : (
                <ul className="divide-y">
                  {relationships.map((r) => {
                    const other = peopleById.get(r.person_a === person.id ? r.person_b : r.person_a);
                    const meta = RELATIONSHIP_TYPES[r.type];
                    return (
                      <li key={r.id}>
                        <Link href={`/admin/relationships/${r.id}`} className="flex flex-wrap items-center gap-3 py-2.5 hover:bg-accent/40 sm:flex-nowrap">
                          {other && <AdminAvatar person={other} size="sm" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{other?.name ?? "?"}</span>
                            <span className="block truncate text-xs text-muted-foreground">{r.description || "—"}</span>
                          </span>
                          <span className="text-xs" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="w-12 text-xs text-muted-foreground">{r.since_year ?? r.since_date?.slice(0, 4) ?? ""}</span>
                          <span className="hidden xl:inline-flex">
                            <StrengthMeter value={r.strength} color={meta.color} />
                          </span>
                          <StatusBadge status={r.status} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="wydarzenia" className="mt-4">
          <Section
            title="Oś czasu"
            description="Kliknij datę, żeby ją zmienić — kolejność ustawia się automatycznie."
            actions={
              <Button size="sm" onClick={() => quickAdd({ kind: "event", personA: person.id, onSaved: () => router.refresh() })}>
                <Plus /> Dodaj wydarzenie
              </Button>
            }
          >
            <EventTimeline events={events} />
          </Section>
        </TabsContent>

        <TabsContent value="lore" className="mt-4">
          <Section
            title="Ciekawostki i lore"
            actions={
              <Button size="sm" onClick={() => quickAdd({ kind: "lore", personA: person.id, onSaved: () => router.refresh() })}>
                <Plus /> Dodaj lore
              </Button>
            }
          >
            {lore.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak lore dla tej osoby.</p>
            ) : (
              <ul className="grid gap-2">
                {lore.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => guard(() => router.push(`/admin/lore/${l.id}`))}
                      className="grid w-full gap-1 rounded-md border p-3 text-left hover:border-ring"
                    >
                      {l.title && <span className="text-sm font-medium">{l.title}</span>}
                      <span className="text-sm text-muted-foreground">{l.content}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{LORE_TYPE_LABEL[l.lore_type]}</span>
                        {l.year && <span className="text-muted-foreground">· {l.year}</span>}
                        <ConfidenceBadge confidence={l.confidence} />
                        <StatusBadge status={l.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Section title="Zdjęcia i avatar" description="Główne zdjęcie (gwiazdka) jest publicznym avatarem osoby.">
            <MediaManager ownerType="person" ownerId={person.id} kind="avatar" files={media} />
          </Section>
        </TabsContent>

        <TabsContent value="podglad" className="mt-4">
          <Section
            title="Podgląd publicznego profilu"
            description={person.status === "published" ? "Tak wygląda profil na stronie." : "Tryb PREVIEW — ta osoba nie jest jeszcze publiczna."}
            actions={
              <Button asChild size="sm" variant="outline">
                <a href={previewHref(`/osoba/${person.slug}`)} target="_blank" rel="noreferrer">
                  <ExternalLink /> Otwórz w nowej karcie
                </a>
              </Button>
            }
          >
            {tab === "podglad" && (
              <iframe
                title={`Podgląd: ${person.first_name}`}
                src={previewHref(`/osoba/${person.slug}`)}
                className="h-[75vh] w-full rounded-md border bg-black"
              />
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
