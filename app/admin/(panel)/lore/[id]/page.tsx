import type { Metadata } from "next";
import Link from "next/link";
import { getLoreDetail } from "@/lib/queries/admin";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { StatusBadge } from "@/components/admin/common/badges";
import { LoreForm } from "@/components/admin/forms/lore-form";
import { MediaManager } from "@/components/admin/media/media-manager";
import { EntityHeaderActions } from "@/components/admin/entity-header-actions";

export const metadata: Metadata = { title: "Lore" };

export default async function LoreEntryPage({ params }: PageProps<"/admin/lore/[id]">) {
  const { id } = await params;
  const { lore, media } = await getLoreDetail(id);
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/lore" className="hover:underline">
            Lore
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {lore.title || "Wpis lore"}
            <StatusBadge status={lore.status} long />
          </span>
        }
        actions={<EntityHeaderActions kind="lore" id={lore.id} status={lore.status} />}
      />
      <Section>
        <LoreForm key={lore.updated_at} lore={lore} />
      </Section>
      <Section title="Zdjęcia">
        <MediaManager ownerType="lore" ownerId={lore.id} kind="lore" files={media} />
      </Section>
    </div>
  );
}
