import type { Metadata } from "next";
import Link from "next/link";
import { getEventDetail } from "@/lib/queries/admin";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { StatusBadge } from "@/components/admin/common/badges";
import { EventForm } from "@/components/admin/forms/event-form";
import { MediaManager } from "@/components/admin/media/media-manager";
import { EntityHeaderActions } from "@/components/admin/entity-header-actions";

export const metadata: Metadata = { title: "Wydarzenie" };

export default async function EventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const { event, media } = await getEventDetail(id);
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/events" className="hover:underline">
            Wydarzenia
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {event.title}
            <StatusBadge status={event.status} long />
          </span>
        }
        actions={<EntityHeaderActions kind="event" id={event.id} status={event.status} />}
      />
      <Section>
        <EventForm key={event.updated_at} event={event} />
      </Section>
      <Section title="Zdjęcia wydarzenia">
        <MediaManager ownerType="event" ownerId={event.id} kind="event" files={media} />
      </Section>
    </div>
  );
}
