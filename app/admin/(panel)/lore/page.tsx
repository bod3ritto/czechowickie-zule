import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listLore } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { Button } from "@/components/admin/ui/button";
import { LoreTable } from "@/components/admin/tables/lore-table";

export const metadata: Metadata = { title: "Lore" };

export default async function LorePage() {
  const lore = await listLore();
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Lore"
        description="Lokalne historie, ciekawostki, cytaty, legendy, inside jokes i plotki. Niezweryfikowane wpisy są publicznie oznaczane."
        actions={
          <Button asChild>
            <Link href="/admin/lore/new">
              <Plus /> Dodaj lore
            </Link>
          </Button>
        }
      />
      <LoreTable lore={lore} />
    </div>
  );
}
