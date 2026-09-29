import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGraphIndex, getPublishedDataset } from "@/lib/data";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { relationshipPath, site } from "@/lib/site";
import { RelationshipPanel } from "@/components/relationship/relationship-panel";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { relationships } = await getPublishedDataset();
  return relationships.map((rel) => ({ id: rel.id }));
}

export async function generateMetadata({ params }: PageProps<"/relacja/[id]">): Promise<Metadata> {
  const { id } = await params;
  const index = await getGraphIndex();
  const rel = index.relationships.get(id);
  if (!rel) return {};
  const a = index.people.get(rel.personA)!;
  const b = index.people.get(rel.personB)!;
  const title = `${a.name} & ${b.name}`;
  const description = `${RELATIONSHIP_TYPES[rel.type].label}${rel.since ? ` od ${rel.since}` : ""}. ${rel.description}`;
  return {
    title,
    description,
    alternates: { canonical: relationshipPath(rel.id) },
    openGraph: { title: `${site.name} — ${title}`, description, url: relationshipPath(rel.id) },
    twitter: { card: "summary_large_image", title: `${site.name} — ${title}`, description },
  };
}

export default async function RelationshipPage({ params }: PageProps<"/relacja/[id]">) {
  const { id } = await params;
  const index = await getGraphIndex();
  const relationship = index.relationships.get(id);
  if (!relationship) notFound();
  return <RelationshipPanel index={index} relationship={relationship} currentYear={new Date().getFullYear()} />;
}
