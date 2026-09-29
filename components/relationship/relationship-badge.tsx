import type { Relationship } from "@/types/domain";
import { RELATIONSHIP_TYPES, isMystery } from "@/lib/relationship-types";
import { cn } from "@/lib/format";

export function RelationshipBadge({ relationship, className }: { relationship: Relationship; className?: string }) {
  const meta = RELATIONSHIP_TYPES[relationship.type];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px]", className)}
      style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}0d` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
      {meta.label}
      {isMystery(relationship) && <span title="Niepotwierdzone">?</span>}
    </span>
  );
}
