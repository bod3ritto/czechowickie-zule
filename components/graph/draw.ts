import type { LinkObject, NodeObject } from "react-force-graph-2d";
import type { Relationship } from "@/types/domain";

export interface GraphNodeData {
  id: string;
  name: string;
  nickname?: string;
  initials: string;
  color: string;
  radius: number;
  /** Unpublished (admin/preview only): drawn with a dashed ring. */
  draft?: boolean;
  /** Profile photo; drawn inside the node once loaded and large enough on screen. */
  avatarUrl?: string;
}

export interface GraphLinkData {
  id: string;
  rel: Relationship;
  color: string;
  dash: number[];
  width: number;
  mystery: boolean;
}

export type GNode = NodeObject<GraphNodeData>;
export type GLink = LinkObject<GraphNodeData, GraphLinkData>;

const NODE_FILL = "#111115";
const LABEL = "#e4e4e7";
const LABEL_DIM = "#8b8b95";

// Canvas can't resolve CSS variables, so the graph resolves next/font families once at mount.
let SANS = "system-ui, sans-serif";
let MONO = "ui-monospace, monospace";
export function configureFonts(sans: string, mono: string) {
  if (sans) SANS = `${sans}, system-ui, sans-serif`;
  if (mono) MONO = `${mono}, ui-monospace, monospace`;
}

// --- Avatars: loaded lazily, cached for the session, drawn cover-cropped in a circle.
const avatarCache = new Map<string, HTMLImageElement | "error">();
let onAvatarLoaded: (() => void) | null = null;

/** The canvas registers a redraw callback so photos appear as soon as they load. */
export function setAvatarLoadHandler(handler: (() => void) | null) {
  onAvatarLoaded = handler;
}

function getAvatar(url: string): HTMLImageElement | null {
  const hit = avatarCache.get(url);
  if (hit === "error") return null;
  if (hit) return hit.complete && hit.naturalWidth > 0 ? hit : null;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => onAvatarLoaded?.();
  img.onerror = () => avatarCache.set(url, "error");
  img.src = url;
  avatarCache.set(url, img);
  return null;
}

/** Below this on-screen radius (px) a photo is unreadable, so we skip loading it. */
const MIN_AVATAR_SCREEN_RADIUS = 6;

export interface NodeDrawState {
  alpha: number;
  active: boolean;
  hovered: boolean;
  /** Show the name label regardless of zoom level. */
  forceLabel: boolean;
}

export function drawNode(node: GNode, ctx: CanvasRenderingContext2D, scale: number, s: NodeDrawState) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const r = node.radius;
  ctx.globalAlpha = s.alpha;

  if (s.active || s.hovered) {
    ctx.save();
    ctx.shadowColor = node.color;
    ctx.shadowBlur = s.active ? 24 : 14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = NODE_FILL;
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = NODE_FILL;
  ctx.fill();

  const photo = node.avatarUrl && r * scale >= MIN_AVATAR_SCREEN_RADIUS ? getAvatar(node.avatarUrl) : null;
  if (photo) {
    const side = Math.min(photo.naturalWidth, photo.naturalHeight);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5 / scale, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      photo,
      (photo.naturalWidth - side) / 2,
      (photo.naturalHeight - side) / 2,
      side,
      side,
      x - r,
      y - r,
      r * 2,
      r * 2,
    );
    ctx.restore();
  }
  ctx.lineWidth = s.active ? Math.max(1.6, 2.4 / scale) : Math.max(0.8, 1.2 / scale);
  ctx.strokeStyle = node.color;
  if (node.draft) ctx.setLineDash([2.5, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (s.active) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3.5, 0, Math.PI * 2);
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = node.color;
    ctx.globalAlpha = s.alpha * 0.5;
    ctx.stroke();
    ctx.globalAlpha = s.alpha;
  }

  // Level of detail: initials only when the node is big enough on screen.
  if (!photo && r * scale > 9) {
    ctx.fillStyle = node.color;
    ctx.font = `600 ${r * 0.72}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.initials, x, y + r * 0.04);
  }

  const showLabel = s.forceLabel || s.hovered || s.active || scale > 0.95;
  if (showLabel && s.alpha > 0.2) {
    const fontSize = 12 / scale;
    ctx.font = `500 ${fontSize}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = LABEL;
    const labelY = y + r + 4 / scale;
    ctx.fillText(node.name, x, labelY);
    if (node.nickname && node.nickname !== node.name && (scale > 2 || s.active || s.hovered)) {
      ctx.font = `400 ${10 / scale}px ${MONO}`;
      ctx.fillStyle = LABEL_DIM;
      ctx.fillText(`„${node.nickname}”`, x, labelY + fontSize * 1.2);
    }
  }
  ctx.globalAlpha = 1;
}

export function paintNodeHitArea(node: GNode, color: string, ctx: CanvasRenderingContext2D, scale: number) {
  // Generous hit area so small nodes are tappable on mobile (≥ ~14px on screen).
  const r = Math.max(node.radius + 2, 14 / scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, Math.PI * 2);
  ctx.fill();
}

export interface LinkDrawState {
  alpha: number;
  active: boolean;
}

export function drawLink(link: GLink, ctx: CanvasRenderingContext2D, scale: number, s: LinkDrawState) {
  const source = link.source as GNode;
  const target = link.target as GNode;
  if (typeof source !== "object" || typeof target !== "object") return;
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  const base = s.active ? 0.95 : 0.38;
  const width = (s.active ? link.width * 1.6 : link.width) / Math.sqrt(scale);
  ctx.globalAlpha = base * s.alpha;
  ctx.strokeStyle = link.color;
  ctx.lineWidth = width;
  ctx.setLineDash(link.dash.length ? link.dash.map((d) => d * Math.max(width, 0.8) * 2) : []);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  if (link.mystery && scale > 1.2 && s.alpha > 0.3) {
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const r = 5 / scale;
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#0b0b0e";
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 0.8 / scale;
    ctx.strokeStyle = link.color;
    ctx.stroke();
    ctx.fillStyle = link.color;
    ctx.font = `600 ${7 / scale}px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", mx, my + 0.3 / scale);
  }
  ctx.globalAlpha = 1;
}

export function paintLinkHitArea(link: GLink, color: string, ctx: CanvasRenderingContext2D, scale: number) {
  const source = link.source as GNode;
  const target = link.target as GNode;
  if (typeof source !== "object" || typeof target !== "object") return;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(link.width, 8 / scale);
  ctx.beginPath();
  ctx.moveTo(source.x ?? 0, source.y ?? 0);
  ctx.lineTo(target.x ?? 0, target.y ?? 0);
  ctx.stroke();
}
