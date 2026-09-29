import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { EventForm } from "@/components/admin/forms/event-form";

export const metadata: Metadata = { title: "Nowe wydarzenie" };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/events" className="hover:underline">
            Wydarzenia
          </Link>
        }
        title="Nowe wydarzenie"
        description="Zdjęcia dodasz po zapisaniu wydarzenia."
      />
      <Section>
        <EventForm />
      </Section>
    </div>
  );
}
