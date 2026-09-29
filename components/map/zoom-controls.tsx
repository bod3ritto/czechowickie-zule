"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/format";
import { useMap } from "./map-context";

const itemClass =
  "grid size-9 place-items-center text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

export function ZoomControls({ hiddenOnMobile }: { hiddenOnMobile?: boolean }) {
  const { graph } = useMap();
  return (
    <div
      role="group"
      aria-label="Sterowanie widokiem"
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-surface/80 backdrop-blur",
        hiddenOnMobile && "max-md:hidden",
      )}
    >
      <button type="button" className={itemClass} onClick={() => graph?.zoomIn()} aria-label="Przybliż">
        <Plus className="size-4" />
      </button>
      <button type="button" className={cn(itemClass, "border-y border-line")} onClick={() => graph?.zoomOut()} aria-label="Oddal">
        <Minus className="size-4" />
      </button>
      <button type="button" className={itemClass} onClick={() => graph?.fit()} aria-label="Pokaż całą mapę">
        <Maximize className="size-3.5" />
      </button>
    </div>
  );
}
