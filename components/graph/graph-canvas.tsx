"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import type { PersonId } from "@/types/domain";
import type { GraphIndex } from "@/lib/graph/model";
import type { VisibleGraph } from "@/lib/graph/visibility";
import { neighborhood } from "@/lib/graph/algorithms";
import { PERSON_CATEGORIES, RELATIONSHIP_TYPES, isMystery } from "@/lib/relationship-types";
import { escapeHtml, initials } from "@/lib/format";
import {
  configureFonts,
  drawLink,
  drawNode,
  paintLinkHitArea,
  paintNodeHitArea,
  type GLink,
  type GNode,
  type GraphLinkData,
  type GraphNodeData,
} from "./draw";
import type { Emphasis, GraphApi } from "./types";
import { configureLiveForces, precomputeLayout } from "./physics";

export interface GraphCanvasProps {
  index: GraphIndex;
  visible: VisibleGraph;
  emphasis: Emphasis;
  /** Changes whenever the camera should re-fit the visible graph (focus mode, filters). */
  fitKey: string;
  /** Whether the side panel / bottom sheet covers part of the canvas. */
  panelOpen: boolean;
  onNodeClick(id: PersonId): void;
  onNodeHover?(id: PersonId | null): void;
  onLinkClick(id: string): void;
  onBackgroundClick(): void;
  onReady(api: GraphApi): void;
}

type Methods = ForceGraphMethods<GNode, GLink>;

const CAMERA_MS = 750;

/**
 * Node objects by id, shared across renders/instances. When the dataset is
 * rebuilt (e.g. the admin saved something), known people keep their current
 * position instead of the whole layout being recomputed.
 */
const nodeCache = new Map<PersonId, GNode>();
const MOBILE_BREAKPOINT = 768;
const DESKTOP_PANEL_WIDTH = 420;
const TOP_BAR_HEIGHT = 56;
const MAX_FIT_ZOOM = 2.4;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function GraphCanvas({
  index,
  visible,
  emphasis,
  fitKey,
  panelOpen,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  onBackgroundClick,
  onReady,
}: GraphCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<Methods | undefined>(undefined);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [hoverId, setHoverId] = useState<PersonId | null>(null);

  // --- Stable node/link objects: d3 mutates them (x, y, source → object), so
  // they are created once per dataset and re-used across filters. That keeps
  // positions when people are hidden and shown again.
  const { allNodes, allLinks } = useMemo(() => {
    const allNodes = new Map<PersonId, GNode>();
    for (const person of index.dataset.people) {
      const degree = index.adjacency.get(person.id)?.length ?? 0;
      const previous = nodeCache.get(person.id);
      allNodes.set(person.id, {
        x: previous?.x,
        y: previous?.y,
        id: person.id,
        name: person.name,
        nickname: person.nickname,
        initials: initials(person.name),
        color: PERSON_CATEGORIES[person.category].color,
        radius: 5 + Math.sqrt(degree) * 2.6,
        draft: person.status === "draft",
      });
    }
    const allLinks = new Map<string, GLink>();
    for (const rel of index.dataset.relationships) {
      const meta = RELATIONSHIP_TYPES[rel.type];
      allLinks.set(rel.id, {
        id: rel.id,
        source: rel.personA,
        target: rel.personB,
        rel,
        color: meta.color,
        dash: isMystery(rel) && meta.dash.length === 0 ? [2, 2] : meta.dash,
        width: 0.5 + rel.strength * 2,
        mystery: isMystery(rel),
      });
    }
    // Settle the layout up front: the first frame is already readable and
    // deep links can frame their subject without waiting for the physics.
    // People with a known position stay pinned while newcomers find a spot.
    const nodes = [...allNodes.values()];
    if (nodes.some((n) => n.x === undefined)) {
      const known = nodes.filter((n) => n.x !== undefined);
      for (const n of known) {
        n.fx = n.x;
        n.fy = n.y;
      }
      precomputeLayout(nodes, [...allLinks.values()]);
      for (const n of known) {
        n.fx = undefined;
        n.fy = undefined;
      }
    }
    for (const n of nodes) nodeCache.set(String(n.id), n);
    return { allNodes, allLinks };
  }, [index]);

  const graphData = useMemo(() => {
    const nodes: GNode[] = [];
    for (const id of visible.people) {
      const node = allNodes.get(id);
      if (node) nodes.push(node);
    }
    const links: GLink[] = [];
    for (const id of visible.relationships) {
      const link = allLinks.get(id);
      if (link) links.push(link);
    }
    return { nodes, links };
  }, [allNodes, allLinks, visible]);

  // --- Emphasis → target opacity per node/link.
  const targets = useMemo(() => {
    const nodes = new Map<string, number>();
    const links = new Map<string, number>();
    const activeNodes = new Set<string>();
    const activeLinks = new Set<string>();
    const allowed = (relId: string) => visible.relationships.has(relId);
    const setAll = (nodeAlpha: number, linkAlpha: number) => {
      for (const id of visible.people) nodes.set(id, nodeAlpha);
      for (const id of visible.relationships) links.set(id, linkAlpha);
    };

    if (emphasis.kind === "person") {
      const depth = neighborhood(index, emphasis.id, 2, (r) => allowed(r.id));
      activeNodes.add(emphasis.id);
      for (const id of visible.people) {
        const d = depth.get(id);
        nodes.set(id, d === undefined ? 0.1 : d <= 1 ? 1 : 0.42);
      }
      for (const id of visible.relationships) {
        const rel = index.relationships.get(id)!;
        const da = depth.get(rel.personA);
        const db = depth.get(rel.personB);
        if (rel.personA === emphasis.id || rel.personB === emphasis.id) {
          links.set(id, 1);
          activeLinks.add(id);
        } else if (da !== undefined && db !== undefined) {
          links.set(id, Math.max(da, db) <= 1 ? 0.55 : 0.28);
        } else links.set(id, 0.05);
      }
    } else if (emphasis.kind === "relationship") {
      const rel = index.relationships.get(emphasis.id);
      setAll(0.12, 0.05);
      if (rel) {
        for (const end of [rel.personA, rel.personB]) {
          nodes.set(end, 1);
          activeNodes.add(end);
          for (const edge of index.adjacency.get(end) ?? []) {
            if (!allowed(edge.relationship.id)) continue;
            if (!activeNodes.has(edge.neighbor)) nodes.set(edge.neighbor, 0.4);
            links.set(edge.relationship.id, 0.3);
          }
        }
        links.set(rel.id, 1);
        activeLinks.add(rel.id);
      }
    } else if (emphasis.kind === "path") {
      setAll(0.1, 0.04);
      for (const id of emphasis.people) {
        nodes.set(id, 1);
        activeNodes.add(id);
      }
      for (const id of emphasis.relationships) {
        links.set(id, 1);
        activeLinks.add(id);
      }
    } else if (hoverId) {
      setAll(0.35, 0.25);
      nodes.set(hoverId, 1);
      for (const edge of index.adjacency.get(hoverId) ?? []) {
        if (!allowed(edge.relationship.id)) continue;
        nodes.set(edge.neighbor, 1);
        links.set(edge.relationship.id, 1);
        activeLinks.add(edge.relationship.id);
      }
    } else {
      setAll(1, 1);
    }
    return { nodes, links, activeNodes, activeLinks, labelAll: emphasis.kind !== "none" };
  }, [emphasis, hoverId, index, visible]);

  // --- Smooth opacity transitions: each frame eases current → target. While
  // anything is still moving we ask force-graph for one more frame.
  const currentAlpha = useRef(new Map<string, number>());
  const animating = useRef(false);

  const ease = useCallback((key: string, target: number) => {
    const current = currentAlpha.current.get(key) ?? target;
    const next = prefersReducedMotion() ? target : current + (target - current) * 0.18;
    if (Math.abs(next - target) > 0.004) animating.current = true;
    currentAlpha.current.set(key, next);
    return next;
  }, []);

  const nodeCanvasObject = useCallback(
    (node: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const id = String(node.id);
      const alpha = ease(`n:${id}`, targets.nodes.get(id) ?? 1);
      drawNode(node, ctx, scale, {
        alpha,
        active: targets.activeNodes.has(id),
        hovered: hoverId === id,
        forceLabel: targets.labelAll && alpha > 0.9,
      });
    },
    [ease, targets, hoverId],
  );

  const linkCanvasObject = useCallback(
    (link: GLink, ctx: CanvasRenderingContext2D, scale: number) => {
      const alpha = ease(`l:${link.id}`, targets.links.get(link.id) ?? 1);
      drawLink(link, ctx, scale, { alpha, active: targets.activeLinks.has(link.id) });
    },
    [ease, targets],
  );

  const onRenderFramePre = useCallback(() => {
    animating.current = false;
  }, []);

  const onRenderFramePost = useCallback(() => {
    if (!animating.current) return;
    requestAnimationFrame(() => {
      const fg = fgRef.current;
      // A no-op zoom marks the canvas dirty so force-graph paints the next frame.
      if (fg) fg.zoom(fg.zoom());
    });
  }, []);

  const linkLabel = useCallback(
    (link: GLink) => {
      const a = index.people.get(link.rel.personA)?.name ?? "";
      const b = index.people.get(link.rel.personB)?.name ?? "";
      const meta = RELATIONSHIP_TYPES[link.rel.type];
      return `<div class="graph-tip"><strong>${escapeHtml(a)} ↔ ${escapeHtml(b)}</strong><span style="color:${meta.color}">${escapeHtml(meta.label)}${link.mystery ? " · niepotwierdzone" : ""}</span>${link.rel.since ? `<span>od ${link.rel.since}</span>` : ""}</div>`;
    },
    [index],
  );

  // --- Camera helpers. The "safe area" excludes the top bar and the side
  // panel / bottom sheet, so subjects are framed where the user can see them.
  const panelOpenRef = useRef(panelOpen);
  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  const safeArea = useCallback(() => {
    const width = wrapperRef.current?.clientWidth ?? 1000;
    const height = wrapperRef.current?.clientHeight ?? 800;
    const mobile = width < MOBILE_BREAKPOINT;
    const pad = mobile ? 24 : 56;
    const right = panelOpenRef.current && !mobile ? Math.min(DESKTOP_PANEL_WIDTH, width * 0.45) + 12 : 0;
    const bottom = panelOpenRef.current && mobile ? height * 0.58 : 0;
    const left = pad;
    const top = TOP_BAR_HEIGHT + pad;
    const w = Math.max(80, width - right - pad - left);
    const h = Math.max(80, height - bottom - pad - top);
    // Offset of the safe-area centre from the canvas centre, in screen px.
    return { w, h, offsetX: left + w / 2 - width / 2, offsetY: top + h / 2 - height / 2 };
  }, []);

  const cameraTo = useCallback(
    (x: number, y: number, k: number, duration = CAMERA_MS) => {
      const fg = fgRef.current;
      if (!fg) return;
      const ms = prefersReducedMotion() ? 0 : duration;
      const area = safeArea();
      fg.zoom(k, ms);
      fg.centerAt(x - area.offsetX / k, y - area.offsetY / k, ms);
    },
    [safeArea],
  );

  const centerOnPerson = useCallback(
    (id: PersonId, duration?: number) => {
      const node = allNodes.get(id);
      if (!node || node.x === undefined || node.y === undefined) return;
      const k = Math.max(fgRef.current?.zoom() ?? 1, 2.2);
      cameraTo(node.x, node.y, k, duration);
    },
    [allNodes, cameraTo],
  );

  const fit = useCallback(
    (ids?: PersonId[], duration?: number) => {
      const fg = fgRef.current;
      if (!fg) return;
      const set = ids ? new Set(ids) : null;
      const bbox = fg.getGraphBbox((n) => (set ? set.has(String(n.id)) : true));
      if (!bbox) return;
      const area = safeArea();
      // Pad the box by the biggest node + label so nothing is clipped.
      const margin = 24;
      const bw = bbox.x[1] - bbox.x[0] + margin * 2;
      const bh = bbox.y[1] - bbox.y[0] + margin * 2;
      const k = Math.min(Math.max(Math.min(area.w / bw, area.h / bh), 0.15), MAX_FIT_ZOOM);
      cameraTo((bbox.x[0] + bbox.x[1]) / 2, (bbox.y[0] + bbox.y[1]) / 2, k, duration);
    },
    [safeArea, cameraTo],
  );

  const applyEmphasisCamera = useCallback(
    (e: Emphasis, duration?: number) => {
      if (e.kind === "person") centerOnPerson(e.id, duration);
      else if (e.kind === "path") fit(e.people, duration);
      else if (e.kind === "relationship") {
        const rel = index.relationships.get(e.id);
        const a = rel && allNodes.get(rel.personA);
        const b = rel && allNodes.get(rel.personB);
        if (a?.x !== undefined && a.y !== undefined && b?.x !== undefined && b.y !== undefined) {
          const k = Math.max(fgRef.current?.zoom() ?? 1, 2);
          cameraTo((a.x + b.x) / 2, (a.y + b.y) / 2, k, duration);
        }
      }
    },
    [allNodes, cameraTo, centerOnPerson, fit, index],
  );

  const firstFitDone = useRef(false);
  // Latest values for callbacks fired by the physics engine.
  const latest = useRef({ emphasis, applyEmphasisCamera, fit, visible });
  useEffect(() => {
    latest.current = { emphasis, applyEmphasisCamera, fit, visible };
  });

  const emphasisKey =
    emphasis.kind === "none"
      ? "none"
      : emphasis.kind === "path"
        ? `path:${emphasis.people.join(">")}`
        : `${emphasis.kind}:${emphasis.id}`;

  useEffect(() => {
    // Move the camera whenever the selection changes.
    const e = latest.current.emphasis;
    if (e.kind !== "none") latest.current.applyEmphasisCamera(e);
    // Closing the panel zooms back out to the overview.
    else if (firstFitDone.current) latest.current.fit();
  }, [emphasisKey]);

  useEffect(() => {
    // Re-fit when focus mode / filters change the visible set (after the
    // simulation had a moment to settle the new layout).
    if (!firstFitDone.current) return;
    const t = setTimeout(() => {
      const { emphasis: e, visible: v, fit: fitNow } = latest.current;
      if (e.kind === "person" && fitKey.startsWith("focus")) fitNow([...v.people]);
      else if (e.kind === "none") fitNow();
    }, 400);
    return () => clearTimeout(t);
  }, [fitKey]);

  // Once the canvas exists: install the shared forces and frame the initial view.
  const mounted = size !== null;
  useEffect(() => {
    const fg = fgRef.current;
    if (!mounted || !fg) return;
    configureLiveForces(fg);
    // force-graph applies its own default zoom after the first data update;
    // frame the initial view right after that, without animation.
    const t = setTimeout(() => {
      const { emphasis: e, fit: fitNow, applyEmphasisCamera: frame } = latest.current;
      if (e.kind === "none") fitNow(undefined, 0);
      else frame(e, 0);
      firstFitDone.current = true;
    }, 50);
    return () => clearTimeout(t);
  }, [mounted]);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    configureFonts(styles.getPropertyValue("--font-geist-sans").trim(), styles.getPropertyValue("--font-geist-mono").trim());
  }, []);

  useEffect(() => {
    onReady({
      zoomIn: () => {
        const fg = fgRef.current;
        if (fg) fg.zoom(fg.zoom() * 1.4, 250);
      },
      zoomOut: () => {
        const fg = fgRef.current;
        if (fg) fg.zoom(fg.zoom() / 1.4, 250);
      },
      fit,
      centerOn: centerOnPerson,
    });
  }, [onReady, fit, centerOnPerson]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleNodeHover = useCallback(
    (node: GNode | null) => {
      const id = node ? String(node.id) : null;
      setHoverId(id);
      onNodeHover?.(id);
    },
    [onNodeHover],
  );

  return (
    <div ref={wrapperRef} className="absolute inset-0" aria-hidden="true">
      {size && (
        <ForceGraph2D<GraphNodeData, GraphLinkData>
          ref={fgRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={paintNodeHitArea}
          linkCanvasObject={linkCanvasObject}
          linkCanvasObjectMode={() => "replace"}
          linkPointerAreaPaint={paintLinkHitArea}
          linkLabel={linkLabel}
          linkHoverPrecision={6}
          onRenderFramePre={onRenderFramePre}
          onRenderFramePost={onRenderFramePost}
          onNodeClick={(node) => onNodeClick(String(node.id))}
          onNodeHover={handleNodeHover}
          onLinkClick={(link) => onLinkClick(link.id)}
          onBackgroundClick={onBackgroundClick}
          cooldownTicks={160}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.35}
          minZoom={0.15}
          maxZoom={8}
          enableNodeDrag
        />
      )}
    </div>
  );
}
