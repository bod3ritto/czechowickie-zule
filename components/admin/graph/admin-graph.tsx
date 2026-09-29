"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOff, Focus, Link2, Loader2, Maximize, Minus, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Switch } from "@/components/admin/ui/switch";
import { GraphView } from "@/components/graph/graph-view";
import type { Emphasis, GraphApi } from "@/components/graph/types";
import { PersonPicker, AdminAvatar } from "@/components/admin/common/person-picker";
import { OptionSelect } from "@/components/admin/common/inputs";
import { StatusBadge } from "@/components/admin/common/badges";
import { PersonForm } from "@/components/admin/forms/person-form";
import { RelationshipForm } from "@/components/admin/forms/relationship-form";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useQuickAdd } from "@/components/admin/shell/quick-add";
import { useNavigationGuard } from "@/components/admin/providers/unsaved-changes";
import { getPersonRow, getRelationshipRow } from "@/lib/actions/reads";
import { computeVisibleGraph } from "@/lib/graph/visibility";
import { FILTERS, type FilterKey } from "@/lib/relationship-types";
import { degreeOf, personLabel } from "@/lib/admin/network";
import type { PersonRow, RelationshipRow } from "@/lib/db/database.types";
import { countLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdminGraphIndex } from "./admin-graph-view";

type Panel =
  | { kind: "person"; id: string; row?: PersonRow }
  | { kind: "relationship"; id: string; row?: RelationshipRow }
  | { kind: "new-relationship"; a: string; b?: string }
  | null;

type AddMode = { step: "a" } | { step: "b"; a: string } | null;

/**
 * Full-screen network editor: the public graph renderer plus admin tools —
 * click to edit in place, add relationships by clicking two people, hide,
 * filter, search and focus.
 */
export function AdminGraph() {
  const router = useRouter();
  const guard = useNavigationGuard();
  const quickAdd = useQuickAdd();
  const { network, peopleById } = useAdminData();
  const [includeArchived, setIncludeArchived] = useState(false);
  const index = useAdminGraphIndex(network, { includeArchived });

  const [filter, setFilter] = useState<FilterKey>("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [graph, setGraph] = useState<GraphApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedPerson = panel?.kind === "person" ? panel.id : null;
  const focusId = focus && selectedPerson ? selectedPerson : null;

  const visible = useMemo(() => {
    const base = computeVisibleGraph(index, { filter, year: null, focusId, pinned: selectedPerson ? [selectedPerson] : [] });
    if (hidden.size === 0) return base;
    const people = new Set([...base.people].filter((id) => !hidden.has(id)));
    const relationships = new Set(
      [...base.relationships].filter((id) => {
        const r = index.relationships.get(id)!;
        return people.has(r.personA) && people.has(r.personB);
      }),
    );
    return { people, relationships };
  }, [index, filter, focusId, selectedPerson, hidden]);

  const emphasis: Emphasis = useMemo(() => {
    if (addMode?.step === "b") return { kind: "person", id: addMode.a };
    if (panel?.kind === "person") return { kind: "person", id: panel.id };
    if (panel?.kind === "relationship") return { kind: "relationship", id: panel.id };
    if (panel?.kind === "new-relationship" && panel.b) return { kind: "path", people: [panel.a, panel.b], relationships: [] };
    return { kind: "none" };
  }, [addMode, panel]);

  const openPerson = useCallback(async (id: string) => {
    setPanel({ kind: "person", id });
    setLoading(true);
    setLoadError(null);
    const r = await getPersonRow({ id });
    setLoading(false);
    if (r.ok) setPanel((p) => (p?.kind === "person" && p.id === id ? { ...p, row: r.data } : p));
    else setLoadError(r.error);
  }, []);

  const openRelationship = useCallback(async (id: string) => {
    setPanel({ kind: "relationship", id });
    setLoading(true);
    setLoadError(null);
    const r = await getRelationshipRow({ id });
    setLoading(false);
    if (r.ok) setPanel((p) => (p?.kind === "relationship" && p.id === id ? { ...p, row: r.data } : p));
    else setLoadError(r.error);
  }, []);

  const onNodeClick = useCallback(
    (id: string) => {
      if (addMode?.step === "a") return setAddMode({ step: "b", a: id });
      if (addMode?.step === "b") {
        if (id === addMode.a) return;
        setAddMode(null);
        return setPanel({ kind: "new-relationship", a: addMode.a, b: id });
      }
      guard(() => void openPerson(id));
    },
    [addMode, guard, openPerson],
  );

  const close = useCallback(() => guard(() => {
    setPanel(null);
    setFocus(false);
  }), [guard]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role=dialog]")) return;
      if (addMode) setAddMode(null);
      else if (panel) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMode, panel, close]);

  const afterSave = () => router.refresh();
  const hiddenCount = hidden.size;

  return (
    <div className="relative -mx-4 -my-6 h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#08080a] sm:-mx-6">
      <div className="map-backdrop pointer-events-none absolute inset-0" aria-hidden="true" />
      <GraphView
        index={index}
        visible={visible}
        emphasis={emphasis}
        fitKey={`${focusId ? "focus" : "all"}:${filter}:${hiddenCount}:${includeArchived}`}
        panelOpen={panel !== null}
        onNodeClick={onNodeClick}
        onLinkClick={(id) => !addMode && guard(() => void openRelationship(id))}
        onBackgroundClick={() => (addMode ? setAddMode(null) : panel && close())}
        onReady={setGraph}
      />

      {/* Toolbar */}
      <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <div className="w-56">
          <PersonPicker
            value={null}
            placeholder="Znajdź osobę…"
            onChange={(id) => {
              if (hidden.has(id)) setHidden((h) => new Set([...h].filter((x) => x !== id)));
              onNodeClick(id);
            }}
          />
        </div>
        <OptionSelect className="h-9 w-40 bg-background/80" value={filter} onChange={(v) => setFilter((v || "all") as FilterKey)} options={FILTERS.map((f) => ({ value: f.key, label: f.label }))} />
        <Button variant={focus ? "secondary" : "outline"} size="sm" disabled={!selectedPerson} onClick={() => setFocus((f) => !f)} title="Pokaż tylko 1. i 2. poziom znajomości">
          <Focus /> Focus
        </Button>
        {hiddenCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => setHidden(new Set())}>
            <EyeOff /> Ukryte: {hiddenCount} · pokaż
          </Button>
        )}
        <label className="flex items-center gap-2 rounded-md border bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground">
          <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} aria-label="Pokaż archiwum" /> Archiwum
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => quickAdd({ kind: "person", onSaved: (id) => { afterSave(); void openPerson(id); } })}>
            <UserPlus /> Osoba
          </Button>
          <Button size="sm" onClick={() => { setPanel(null); setAddMode({ step: "a" }); }}>
            <Link2 /> Dodaj relację
          </Button>
        </div>
      </div>

      {addMode && (
        <div className="absolute inset-x-0 top-16 z-10 flex justify-center px-3">
          <div className="flex items-center gap-3 rounded-lg border border-sky-400/40 bg-background/95 py-1.5 pl-3 pr-1.5 text-sm shadow-xl">
            <span className="grid size-5 place-items-center rounded-full bg-sky-400/20 font-mono text-[11px] text-sky-300">{addMode.step === "a" ? 1 : 2}</span>
            {addMode.step === "a" ? "Kliknij osobę A" : `Kliknij osobę B (A: ${peopleById.get(addMode.a)?.name ?? "?"})`}
            <Button size="xs" variant="ghost" onClick={() => setAddMode(null)}>
              Anuluj <kbd className="font-mono text-[10px] text-muted-foreground">Esc</kbd>
            </Button>
          </div>
        </div>
      )}

      {/* Zoom */}
      <div className={cn("absolute bottom-3 left-3 z-10 flex flex-col overflow-hidden rounded-md border bg-background/80", panel && "max-md:hidden")}>
        <Button variant="ghost" size="icon" className="rounded-none" onClick={() => graph?.zoomIn()} aria-label="Przybliż"><Plus /></Button>
        <Button variant="ghost" size="icon" className="rounded-none border-y" onClick={() => graph?.zoomOut()} aria-label="Oddal"><Minus /></Button>
        <Button variant="ghost" size="icon" className="rounded-none" onClick={() => graph?.fit()} aria-label="Pokaż wszystko"><Maximize /></Button>
      </div>

      <div className="absolute bottom-3 right-3 z-0 hidden font-mono text-[11px] text-muted-foreground md:block">
        {countLabel(visible.people.size, "osoba", "osoby", "osób")} · {countLabel(visible.relationships.size, "relacja", "relacje", "relacji")}
      </div>

      {/* Side panel (bottom sheet on mobile) */}
      {panel && (
        <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-y-auto rounded-t-xl border-t bg-card shadow-2xl md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[400px] md:rounded-xl md:border">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-card px-4 py-3">
            <h2 className="truncate text-sm font-medium">
              {panel.kind === "person" && (peopleById.get(panel.id) ? personLabel(peopleById.get(panel.id)!) : "Osoba")}
              {panel.kind === "relationship" && "Edycja relacji"}
              {panel.kind === "new-relationship" && "Nowa relacja"}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Zamknij panel">
              <X />
            </Button>
          </header>
          <div className="p-4">
            {panel.kind === "person" && (() => {
              const p = peopleById.get(panel.id);
              return (
                <div className="grid gap-4">
                  {p && (
                    <div className="flex items-center gap-3">
                      <AdminAvatar person={p} size="md" />
                      <div className="text-xs text-muted-foreground">
                        <StatusBadge status={p.status} /> <span className="ml-1">{countLabel(degreeOf(network.relationships, p.id), "relacja", "relacje", "relacji")}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setPanel({ kind: "new-relationship", a: panel.id })}>
                      <Link2 /> Relacja z tą osobą
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setFocus((f) => !f)}>
                      <Focus /> {focus ? "Pokaż wszystkich" : "Skup się"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setHidden((h) => new Set(h).add(panel.id)); setPanel(null); }}>
                      <EyeOff /> Ukryj
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/people/${panel.id}`}>Pełny profil →</Link>
                    </Button>
                  </div>
                  {panel.row ? (
                    <PersonForm key={panel.row.updated_at} person={panel.row} compact onSaved={afterSave} />
                  ) : (
                    <LoadState loading={loading} error={loadError} onRetry={() => void openPerson(panel.id)} />
                  )}
                </div>
              );
            })()}
            {panel.kind === "relationship" &&
              (panel.row ? (
                <RelationshipForm key={panel.row.updated_at} relationship={panel.row} compact onSaved={afterSave} />
              ) : (
                <LoadState loading={loading} error={loadError} onRetry={() => void openRelationship(panel.id)} />
              ))}
            {panel.kind === "new-relationship" && (
              <RelationshipForm
                key={`${panel.a}-${panel.b ?? ""}`}
                compact
                prefill={{ personA: panel.a, personB: panel.b }}
                lockPersonA
                onSaved={(id) => {
                  afterSave();
                  void openRelationship(id);
                }}
                onEditExisting={(id) => void openRelationship(id)}
              />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function LoadState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry(): void }) {
  if (loading || !error) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Wczytywanie…
      </p>
    );
  }
  return (
    <div className="grid gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <p className="text-red-200">{error}</p>
      <Button size="sm" variant="outline" className="justify-self-start" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}
