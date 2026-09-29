import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listRelationships } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { Button } from "@/components/admin/ui/button";
import { RelationshipsTable } from "@/components/admin/tables/relationships-table";

export const metadata: Metadata = { title: "Relacje" };

export default async function RelationshipsPage() {
  const relationships = await listRelationships();
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Relacje"
        description="Relacje są nieskierowane: Marek ↔ Krzychu to ta sama relacja co Krzychu ↔ Marek."
        actions={
          <Button asChild>
            <Link href="/admin/relationships/new">
              <Plus /> Dodaj relację
            </Link>
          </Button>
        }
      />
      <RelationshipsTable relationships={relationships} />
    </div>
  );
}
