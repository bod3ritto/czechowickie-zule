import type { Confidence, LoreType } from "@/types/domain";
import { CONFIDENCE_BADGE, LORE_TYPE_LABEL } from "@/lib/relationship-types";
import { cn } from "@/lib/format";

/** Type · year · confidence badge under a lore entry. Unverified info is always labelled. */
export function LoreMeta({ type, confidence, year }: { type: LoreType; confidence: Confidence; year?: number }) {
  const badge = CONFIDENCE_BADGE[confidence];
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-fg-subtle">
      <span>{LORE_TYPE_LABEL[type]}</span>
      {year && <span>· {year}</span>}
      {badge && (
        <span
          className={cn(
            "rounded border px-1 py-px",
            confidence === "rumor" ? "border-orange-400/30 text-orange-300/90" : "border-line-strong text-fg-muted",
          )}
        >
          {badge}
        </span>
      )}
    </p>
  );
}
