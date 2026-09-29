import type { Metadata } from "next";
import { listAudit } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { AuditTable } from "@/components/admin/tables/audit-table";

export const metadata: Metadata = { title: "Historia zmian" };

export default async function AuditPage() {
  const rows = await listAudit(1000);
  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="Historia zmian"
        description="Zapisywana automatycznie przez bazę danych (triggery) — nie da się jej obejść ani podrobić z panelu."
      />
      <AuditTable rows={rows} />
    </div>
  );
}
