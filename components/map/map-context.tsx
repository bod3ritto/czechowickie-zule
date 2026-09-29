"use client";

import { createContext, useContext } from "react";
import type { PersonId, RelationshipId } from "@/types/domain";
import type { GraphIndex } from "@/lib/graph/model";
import type { VisibleGraph } from "@/lib/graph/visibility";
import type { PathStep } from "@/lib/graph/algorithms";
import type { FilterKey } from "@/lib/relationship-types";
import type { GraphApi } from "@/components/graph/types";

export type Selection =
  | { kind: "person"; id: PersonId }
  | { kind: "relationship"; id: RelationshipId }
  | null;

export interface ActivePath {
  from: PersonId;
  to: PersonId;
  steps: PathStep[];
}

export interface MapState {
  index: GraphIndex;
  selection: Selection;
  visible: VisibleGraph;
  filter: FilterKey;
  year: number | null;
  yearRange: [number, number];
  timelineOpen: boolean;
  focusMode: boolean;
  path: ActivePath | null;
  graph: GraphApi | null;
}

export interface MapActions {
  selectPerson(id: PersonId): void;
  selectRelationship(id: RelationshipId): void;
  clearSelection(): void;
  randomPerson(): void;
  setFilter(filter: FilterKey): void;
  setYear(year: number | null): void;
  setTimelineOpen(open: boolean): void;
  setFocusMode(on: boolean): void;
  showPath(path: ActivePath | null): void;
  openSearch(): void;
  openPathTool(from?: PersonId, to?: PersonId): void;
  openNetworkStats(): void;
  notify(message: string, title?: string): void;
}

export type MapContextValue = MapState & MapActions;

export const MapContext = createContext<MapContextValue | null>(null);

export function useMap(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMap must be used inside <MapShell>");
  return ctx;
}

/** Same as useMap, but returns null outside the map (e.g. on /ludzie). */
export function useOptionalMap(): MapContextValue | null {
  return useContext(MapContext);
}

export function parseSelection(pathname: string): Selection {
  const match = pathname.match(/^\/(osoba|relacja)\/([^/]+)\/?$/);
  if (!match) return null;
  const id = decodeURIComponent(match[2]);
  return match[1] === "osoba" ? { kind: "person", id } : { kind: "relationship", id };
}
