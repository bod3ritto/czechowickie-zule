import type { Metadata } from "next";
import { listEvents, listLocations, listPeople, listRelationships } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { LocationsManager } from "@/components/admin/locations-manager";

export const metadata: Metadata = { title: "Lokalizacje" };

export default async function LocationsPage() {
  const [locations, people, relationships, events] = await Promise.all([listLocations(), listPeople(), listRelationships(), listEvents()]);
  const usage: Record<string, number> = {};
  for (const item of [...people, ...relationships, ...events]) {
    if (item.location_id) usage[item.location_id] = (usage[item.location_id] ?? 0) + 1;
  }
  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="Lokalizacje" description="Miejsca, w których toczą się historie. Publicznie widoczna jest tylko nazwa." />
      <LocationsManager locations={locations} usage={usage} />
    </div>
  );
}
