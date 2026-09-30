import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { listChangeRequests, listSubmissions } from "@/lib/queries/admin";
import { AdminPageHeader, EmptyState } from "@/components/admin/common/layout";
import { SubmissionsQueue } from "@/components/admin/submissions-queue";
import { ChangeRequests } from "@/components/admin/change-requests";

export const metadata: Metadata = { title: "Zgłoszenia" };

export default async function SubmissionsPage() {
  const [{ people, relationships }, requests] = await Promise.all([listSubmissions(), listChangeRequests()]);
  const nothingOpen = people.length + relationships.length + requests.open.length === 0;
  return (
    <div className="mx-auto grid max-w-4xl gap-8">
      <AdminPageHeader
        title="Zgłoszenia"
        description="Prośby o zmianę lub usunięcie oraz osoby i relacje dodane przez odwiedzających. Nowe wpisy pojawią się na mapie dopiero po zatwierdzeniu."
      />
      {nothingOpen && (
        <EmptyState
          icon={<Inbox />}
          title="Brak zgłoszeń do sprawdzenia"
          description="Tu trafiają osoby i relacje dodane przyciskiem „Dodaj” na mapie oraz prośby wysłane przez „Zgłoś zmianę”."
        />
      )}
      <ChangeRequests open={requests.open} closed={requests.closed} />
      <SubmissionsQueue people={people} relationships={relationships} />
    </div>
  );
}
