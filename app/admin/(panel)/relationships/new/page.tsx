import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { RelationshipForm } from "@/components/admin/forms/relationship-form";

export const metadata: Metadata = { title: "Nowa relacja" };

export default async function NewRelationshipPage({ searchParams }: PageProps<"/admin/relationships/new">) {
  const params = await searchParams;
  const personA = typeof params.a === "string" ? params.a : undefined;
  const personB = typeof params.b === "string" ? params.b : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/relationships" className="hover:underline">
            Relacje
          </Link>
        }
        title="Nowa relacja"
      />
      <Section>
        <RelationshipForm prefill={{ personA, personB }} />
      </Section>
    </div>
  );
}
