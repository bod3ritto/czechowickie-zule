"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/common/data-table";
import { EmptyState, formatDate } from "@/components/admin/common/layout";
import { AUDIT_ACTION_LABEL, ENTITY_LABEL, auditHref } from "@/components/admin/audit-list";
import type { AuditAction, AuditLogRow } from "@/lib/db/database.types";

const ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[];
const ENTITIES = ["people", "relationships", "events", "lore", "locations", "dataset"];

export function AuditTable({ rows }: { rows: AuditLogRow[] }) {
  const columns: Column<AuditLogRow>[] = [
    { key: "date", header: "Data", sortValue: (r) => r.created_at, cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatDate(r.created_at, true)}</span> },
    { key: "admin", header: "Admin", sortValue: (r) => r.actor_email ?? "", cell: (r) => <span className="text-muted-foreground">{r.actor_email ?? "system"}</span> },
    { key: "action", header: "Akcja", sortValue: (r) => r.action, cell: (r) => `${AUDIT_ACTION_LABEL[r.action]} ${ENTITY_LABEL[r.entity_type] ?? r.entity_type}` },
    {
      key: "object",
      header: "Obiekt",
      sortValue: (r) => r.entity_label ?? "",
      cell: (r) => {
        const href = auditHref(r);
        return href ? (
          <Link href={href} className="hover:underline">
            {r.entity_label}
          </Link>
        ) : (
          <span className={r.action === "deleted" ? "text-muted-foreground line-through" : undefined}>{r.entity_label ?? "—"}</span>
        );
      },
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getId={(r) => String(r.id)}
      searchText={(r) => `${r.entity_label ?? ""} ${r.actor_email ?? ""}`}
      searchPlaceholder="Obiekt lub admin…"
      initialSort={{ key: "date", dir: "desc" }}
      pageSize={50}
      filters={[
        { key: "action", label: "Akcja", options: ACTIONS.map((a) => ({ value: a, label: AUDIT_ACTION_LABEL[a] })), predicate: (r, v) => r.action === v },
        { key: "entity", label: "Typ", options: ENTITIES.map((e) => ({ value: e, label: ENTITY_LABEL[e] })), predicate: (r, v) => r.entity_type === v },
      ]}
      mobileCard={(r) => (
        <div className="grid gap-0.5 text-sm">
          <span>
            {AUDIT_ACTION_LABEL[r.action]} {ENTITY_LABEL[r.entity_type] ?? r.entity_type}: <strong className="font-medium">{r.entity_label ?? "—"}</strong>
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(r.created_at, true)} · {r.actor_email ?? "system"}
          </span>
        </div>
      )}
      empty={<EmptyState icon={<History />} title="Brak historii zmian" description="Każda zmiana w panelu pojawi się tutaj automatycznie." />}
    />
  );
}
