import Link from "next/link";
import type { AuditAction, AuditLogRow } from "@/lib/db/database.types";
import { formatDate } from "@/components/admin/common/layout";
import { cn } from "@/lib/utils";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  created: "Utworzono",
  updated: "Edytowano",
  deleted: "Usunięto",
  published: "Opublikowano",
  unpublished: "Cofnięto publikację",
  archived: "Zarchiwizowano",
  imported: "Zaimportowano",
};

export const ENTITY_LABEL: Record<string, string> = {
  people: "osobę",
  relationships: "relację",
  events: "wydarzenie",
  lore: "lore",
  locations: "lokalizację",
  dataset: "dane",
};

const ENTITY_HREF: Record<string, string> = {
  people: "/admin/people/",
  relationships: "/admin/relationships/",
  events: "/admin/events/",
  lore: "/admin/lore/",
};

const ACTION_COLOR: Record<AuditAction, string> = {
  created: "text-emerald-300",
  updated: "text-sky-300",
  deleted: "text-red-300",
  published: "text-emerald-300",
  unpublished: "text-amber-300",
  archived: "text-zinc-400",
  imported: "text-violet-300",
};

export function auditHref(row: AuditLogRow): string | null {
  if (row.action === "deleted" || !row.entity_id) return null;
  const base = ENTITY_HREF[row.entity_type];
  return base ? `${base}${row.entity_id}` : null;
}

/** Compact list used on the dashboard. */
export function AuditList({ rows }: { rows: AuditLogRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Brak zmian.</p>;
  return (
    <ol className="grid gap-2.5">
      {rows.map((row) => {
        const href = auditHref(row);
        const label = row.entity_label ?? "—";
        return (
          <li key={row.id} className="grid gap-0.5 text-sm">
            <p className="truncate">
              <span className={cn("font-medium", ACTION_COLOR[row.action])}>{AUDIT_ACTION_LABEL[row.action]}</span>{" "}
              <span className="text-muted-foreground">{ENTITY_LABEL[row.entity_type] ?? row.entity_type}</span>{" "}
              {href ? (
                <Link href={href} className="hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(row.created_at, true)} · {row.actor_email ?? "system"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
