import type { Status } from "@/lib/db/enums";
import { STATUS_LABEL } from "@/lib/db/enums";
import type { Confidence } from "@/types/domain";
import { CONFIDENCE_LABEL } from "@/lib/relationship-types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<Status, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  archived: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

const STATUS_SHORT: Record<Status, string> = {
  published: "Opublikowane",
  draft: "Szkic",
  archived: "Archiwum",
};

export function StatusBadge({ status, className, long }: { status: Status; className?: string; long?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", STATUS_STYLE[status], className)}
      title={STATUS_LABEL[status]}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {long ? STATUS_LABEL[status] : STATUS_SHORT[status]}
    </span>
  );
}

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  confirmed: "text-emerald-300",
  probable: "text-sky-300",
  lore: "text-violet-300",
  rumor: "text-orange-300",
};

export function ConfidenceBadge({ confidence, className }: { confidence: Confidence; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap", CONFIDENCE_STYLE[confidence], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

/** Relationship strength as words — the number is secondary. */
export function strengthLabel(value: number): string {
  if (value >= 85) return "bardzo bliska";
  if (value >= 65) return "bliska";
  if (value >= 40) return "dobra";
  if (value >= 20) return "luźna";
  return "ledwo";
}

export function StrengthMeter({ value, color }: { value: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-2" title={`${value}/100`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: color ?? "var(--primary)" }} />
      </span>
      <span className="text-xs text-muted-foreground">{strengthLabel(value)}</span>
    </span>
  );
}
