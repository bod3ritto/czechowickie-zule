import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listPeople } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { Button } from "@/components/admin/ui/button";
import { PeopleTable } from "@/components/admin/tables/people-table";

export const metadata: Metadata = { title: "Osoby" };

export default async function PeoplePage() {
  const people = await listPeople();
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Osoby"
        description="Wszyscy na mapie — także wersje robocze i archiwum."
        actions={
          <Button asChild>
            <Link href="/admin/people/new">
              <Plus /> Dodaj osobę
            </Link>
          </Button>
        }
      />
      <PeopleTable people={people} />
    </div>
  );
}
