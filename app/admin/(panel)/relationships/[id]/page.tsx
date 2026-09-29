import type { Metadata } from "next";
import Link from "next/link";
import { getNetwork, getRelationshipDetail } from "@/lib/queries/admin";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { StatusBadge } from "@/components/admin/common/badges";
import { RelationshipForm } from "@/components/admin/forms/relationship-form";
import { EntityHeaderActions } from "@/components/admin/entity-header-actions";

export const metadata: Metadata = { title: "Relacja" };

export default async function RelationshipPage({ params }: PageProps<"/admin/relationships/[id]">) {
  const { id } = await params;
  const [{ relationship, events }, network] = await Promise.all([getRelationshipDetail(id), getNetwork()]);
  const name = (pid: string) => network.people.find((p) => p.id === pid)?.name ?? "?";

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/relationships" className="hover:underline">
            Relacje
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {name(relationship.person_a)} ↔ {name(relationship.person_b)}
            <StatusBadge status={relationship.status} long />
          </span>
        }
        actions={<EntityHeaderActions kind="relationship" id={relationship.id} status={relationship.status} previewPath={`/relacja/${relationship.slug}`} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Section>
          <RelationshipForm key={relationship.updated_at} relationship={relationship} />
        </Section>
        <Section title="Jak się poznali?" description="Wydarzenia przypisane do tej relacji.">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak wydarzeń. Dodaj wydarzenie z obiema osobami i zaznacz tę relację.</p>
          ) : (
            <ol className="grid gap-2">
              {events
                .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
                .map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}`} className="block rounded-md border p-2.5 text-sm hover:border-ring">
                      <span className="font-mono text-xs text-amber-300">{e.year ?? "bez daty"}</span>
                      <span className="block font-medium">{e.title}</span>
                    </Link>
                  </li>
                ))}
            </ol>
          )}
        </Section>
      </div>
    </div>
  );
}
