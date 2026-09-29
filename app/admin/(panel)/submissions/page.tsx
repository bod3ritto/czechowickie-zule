import type { Metadata } from "next";
import { listSubmissions } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { SubmissionsQueue } from "@/components/admin/submissions-queue";

export const metadata: Metadata = { title: "Zgłoszenia" };

export default async function SubmissionsPage() {
  const { people, relationships } = await listSubmissions();
  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Zgłoszenia"
        description="Osoby i relacje dodane przez odwiedzających. Na mapie pojawią się dopiero po zatwierdzeniu."
      />
      <SubmissionsQueue people={people} relationships={relationships} />
    </div>
  );
}
