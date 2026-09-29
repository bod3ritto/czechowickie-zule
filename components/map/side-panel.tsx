"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

interface SidePanelProps {
  children: ReactNode;
  onClose(): void;
  /** Scroll back to top when this changes (new person/relationship). */
  scrollKey: string;
}

/**
 * Desktop/tablet: panel sliding in from the right.
 * Mobile: bottom sheet (tap/drag the handle to expand, drag down to close).
 */
export function SidePanel({ children, onClose, scrollKey }: SidePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragY(e.clientY - dragStart.current);
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > 90) {
      if (expanded) setExpanded(false);
      else onClose();
    } else if (dragY < -60) setExpanded(true);
    else if (Math.abs(dragY) < 6) setExpanded((v) => !v);
    setDragY(0);
  };

  return (
    <aside
      aria-label="Szczegóły"
      className={cn(
        "absolute z-20 flex flex-col border-line bg-surface shadow-2xl shadow-black/60",
        // mobile bottom sheet
        "inset-x-0 bottom-0 rounded-t-2xl border-t animate-sheet-in transition-[height] duration-300 ease-out",
        expanded ? "h-[92dvh]" : "h-[58dvh]",
        // tablet/desktop side panel
        "md:bottom-3 md:left-auto md:right-3 md:top-[64px] md:h-auto md:w-[380px] md:rounded-xl md:border md:animate-panel-in lg:w-[420px]",
      )}
      style={dragY ? { transform: `translateY(${Math.max(dragY, -40)}px)`, transition: "none" } : undefined}
    >
      <div
        className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={expanded ? "Zwiń panel" : "Rozwiń panel"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <span className="h-1 w-10 rounded-full bg-white/15" />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Zamknij panel (Esc)"
        className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-brand md:top-4"
      >
        <X className="size-4" />
      </button>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-1 md:px-6 md:pt-6">
        {children}
      </div>
    </aside>
  );
}
