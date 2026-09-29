import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listEvents } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { Button } from "@/components/admin/ui/button";
import { EventsTable } from "@/components/admin/tables/events-table";

export const metadata: Metadata = { title: "Wydarzenia" };

export default async function EventsPage() {
  const events = await listEvents();
  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Wydarzenia"
        description="Wydarzenia tworzą oś czasu osób i historie relacji („Jak się poznali?”)."
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus /> Dodaj wydarzenie
            </Link>
          </Button>
        }
      />
      <EventsTable events={events} />
    </div>
  );
}
