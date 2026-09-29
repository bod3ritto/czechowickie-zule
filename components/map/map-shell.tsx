"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Dataset, PersonId } from "@/types/domain";
import { buildGraphIndex } from "@/lib/graph/model";
import { computeVisibleGraph } from "@/lib/graph/visibility";
import { yearRange as computeYearRange } from "@/lib/graph/stats";
import { CONFIDENCE_BADGE, type FilterKey } from "@/lib/relationship-types";
import { personPath, relationshipPath } from "@/lib/site";
import { GraphView } from "@/components/graph/graph-view";
import type { Emphasis, GraphApi } from "@/components/graph/types";
import { MapContext, parseSelection, type ActivePath, type MapContextValue } from "./map-context";
import { TopBar } from "./top-bar";
import { SidePanel } from "./side-panel";
import { ZoomControls } from "./zoom-controls";
import { SearchDialog } from "./search-dialog";
import { PathDialog } from "./path-dialog";
import { TimelineBar } from "./timeline-bar";
import { PathBanner } from "./path-banner";
import { LoreOfTheDay } from "./lore-of-the-day";
import { NetworkStatsCard, NetworkStatsDialog } from "./network-stats";
import { OnboardingHint } from "./onboarding-hint";
import { Toast, type ToastMessage } from "./toast";

interface MapShellProps {
  dataset: Dataset;
  children: ReactNode;
}

export function MapShell({ dataset, children }: MapShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const index = useMemo(() => buildGraphIndex(dataset), [dataset]);
  const range = useMemo(() => computeYearRange(index), [index]);

  const rawSelection = parseSelection(pathname);
  // Ignore URLs pointing at ids that don't exist (the page itself renders 404).
  const selection =
    rawSelection &&
    (rawSelection.kind === "person" ? index.people.has(rawSelection.id) : index.relationships.has(rawSelection.id))
      ? rawSelection
      : null;
  const selectedPersonId = selection?.kind === "person" ? selection.id : null;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [year, setYear] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpenState] = useState(false);
  const [focusRequested, setFocusMode] = useState(false);
  const [path, setPath] = useState<ActivePath | null>(null);
  const [graph, setGraph] = useState<GraphApi | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pathTool, setPathTool] = useState<{ open: boolean; from?: PersonId; to?: PersonId }>({ open: false });
  const [statsOpen, setStatsOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const focusMode = focusRequested && selectedPersonId !== null;

  const visible = useMemo(
    () =>
      computeVisibleGraph(index, {
        filter,
        year,
        focusId: focusMode ? selectedPersonId : null,
        pinned: [
          ...(selectedPersonId ? [selectedPersonId] : []),
          ...(path ? path.steps.map((s) => s.personId) : []),
        ],
      }),
    [index, filter, year, focusMode, selectedPersonId, path],
  );

  const emphasis: Emphasis = useMemo(() => {
    if (path) {
      return {
        kind: "path",
        people: path.steps.map((s) => s.personId),
        relationships: path.steps.flatMap((s) => (s.via ? [s.via.id] : [])),
      };
    }
    if (selection) return selection;
    return { kind: "none" };
    // `selection` is recreated each render; depend on its identity-free parts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, selection?.kind, selection?.id]);

  const notify = useCallback((message: string, title?: string) => {
    setToast({ id: Date.now(), message, title });
  }, []);

  const selectPerson = useCallback(
    (id: PersonId) => {
      setPath(null);
      router.push(personPath(id), { scroll: false });
    },
    [router],
  );

  const selectRelationship = useCallback(
    (id: string) => {
      setPath(null);
      router.push(relationshipPath(id), { scroll: false });
    },
    [router],
  );

  const clearSelection = useCallback(() => {
    setFocusMode(false);
    router.push("/", { scroll: false });
  }, [router]);

  const randomPerson = useCallback(() => {
    const pool = [...visible.people].filter((id) => id !== selectedPersonId);
    if (pool.length === 0) return;
    const id = pool[Math.floor(Math.random() * pool.length)];
    const person = index.people.get(id);
    selectPerson(id);
    const lore = index.loreByPerson.get(id) ?? [];
    if (person && lore.length > 0) {
      const entry = lore[Math.floor(Math.random() * lore.length)];
      const badge = CONFIDENCE_BADGE[entry.confidence];
      notify(
        badge ? `${entry.content} (${badge})` : entry.content,
        `🎲 ${person.name}${person.nickname && person.nickname !== person.name ? ` „${person.nickname}”` : ""}`,
      );
    }
  }, [visible, selectedPersonId, index, selectPerson, notify]);

  const setTimelineOpen = useCallback(
    (open: boolean) => {
      setTimelineOpenState(open);
      setYear(open ? range[1] : null);
    },
    [range],
  );

  const handleBackgroundClick = useCallback(() => {
    if (path) setPath(null);
    else if (selection) clearSelection();
  }, [path, selection, clearSelection]);

  const prefetchPerson = useCallback(
    (id: PersonId | null) => {
      if (id) router.prefetch(personPath(id));
    },
    [router],
  );

  // Global keyboard shortcuts. Native <dialog>s handle their own Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      if (path) setPath(null);
      else if (focusMode) setFocusMode(false);
      else if (selection) clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, focusMode, selection, clearSelection]);

  const value: MapContextValue = {
    index,
    selection,
    visible,
    filter,
    year,
    yearRange: range,
    timelineOpen,
    focusMode,
    path,
    graph,
    selectPerson,
    selectRelationship,
    clearSelection,
    randomPerson,
    setFilter,
    setYear,
    setTimelineOpen,
    setFocusMode,
    showPath: setPath,
    openSearch: () => setSearchOpen(true),
    openPathTool: (from, to) => setPathTool({ open: true, from, to }),
    openNetworkStats: () => setStatsOpen(true),
    notify,
  };

  const panelOpen = selection !== null;
  const fitKey = `${focusMode ? "focus" : "all"}:${filter}`;

  return (
    <MapContext.Provider value={value}>
      <div className="fixed inset-0 overflow-hidden bg-bg">
        <div className="map-backdrop pointer-events-none absolute inset-0" aria-hidden="true" />
        <GraphView
          index={index}
          visible={visible}
          emphasis={emphasis}
          fitKey={fitKey}
          panelOpen={panelOpen}
          onNodeClick={selectPerson}
          onNodeHover={prefetchPerson}
          onLinkClick={selectRelationship}
          onBackgroundClick={handleBackgroundClick}
          onReady={setGraph}
        />

        <TopBar />
        <PathBanner />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
          <div className="pointer-events-auto flex items-end gap-3">
            <ZoomControls hiddenOnMobile={panelOpen} />
            {!panelOpen && <NetworkStatsCard className="hidden lg:block" />}
          </div>
          {!panelOpen && !timelineOpen && <LoreOfTheDay className="pointer-events-auto" />}
        </div>

        {timelineOpen && <TimelineBar panelOpen={panelOpen} />}

        {panelOpen ? (
          <SidePanel key={selection.kind} onClose={clearSelection} scrollKey={pathname}>
            {children}
          </SidePanel>
        ) : (
          children
        )}

        <OnboardingHint />
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
        <PathDialog
          open={pathTool.open}
          initialFrom={pathTool.from}
          initialTo={pathTool.to}
          onClose={() => setPathTool({ open: false })}
        />
        <NetworkStatsDialog open={statsOpen} onClose={() => setStatsOpen(false)} />
        <Toast message={toast} onDismiss={() => setToast(null)} />
      </div>
    </MapContext.Provider>
  );
}
