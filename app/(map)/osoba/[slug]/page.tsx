import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGraphIndex, getPublishedDataset } from "@/lib/data";
import { personPath, site } from "@/lib/site";
import { countLabel } from "@/lib/format";
import { PersonPanel } from "@/components/person/person-panel";

/**
 * Published people are prerendered at build time; people published later are
 * rendered on first visit (and refreshed by revalidatePath after admin edits).
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const { people } = await getPublishedDataset();
  return people.map((person) => ({ slug: person.id }));
}

export async function generateMetadata({ params }: PageProps<"/osoba/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const index = await getGraphIndex();
  const person = index.people.get(slug);
  if (!person) return {};
  const degree = index.adjacency.get(person.id)?.length ?? 0;
  const label = person.nickname && person.nickname !== person.name ? `${person.name} „${person.nickname}”` : person.name;
  const description = `${person.bio} ${countLabel(degree, "powiązanie", "powiązania", "powiązań")} na mapie Czechowic-Dziedzic.`;
  return {
    title: person.name,
    description,
    alternates: { canonical: personPath(person.id) },
    openGraph: {
      title: `${site.name} — ${label}`,
      description,
      url: personPath(person.id),
      type: "profile",
    },
    twitter: { card: "summary_large_image", title: `${site.name} — ${label}`, description },
  };
}

export default async function PersonPage({ params }: PageProps<"/osoba/[slug]">) {
  const { slug } = await params;
  const index = await getGraphIndex();
  const person = index.people.get(slug);
  if (!person) notFound();
  return <PersonPanel index={index} person={person} currentYear={new Date().getFullYear()} />;
}
