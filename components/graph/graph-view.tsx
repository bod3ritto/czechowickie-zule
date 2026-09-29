"use client";

import dynamic from "next/dynamic";
import type { GraphCanvasProps } from "./graph-canvas";

/**
 * The canvas graph touches `window` and is pure client-side interactivity,
 * so it's loaded without SSR. The loader matches the page background to
 * avoid any flash.
 */
const GraphCanvas = dynamic(() => import("./graph-canvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center" role="status">
      <div className="flex items-center gap-3 font-mono text-xs text-fg-subtle">
        <span className="size-1.5 animate-ping rounded-full bg-brand" />
        rysuję sieć powiązań…
      </div>
    </div>
  ),
});

export function GraphView(props: GraphCanvasProps) {
  return <GraphCanvas {...props} />;
}
