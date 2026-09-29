import { getPublishedDataset, getPublishedGraphIndex } from "@/lib/data";
import { OG_SIZE, renderOgCard } from "@/lib/og";
import { PERSON_CATEGORIES } from "@/lib/relationship-types";
import { countLabel, initials } from "@/lib/format";

export const alt = "Profil osoby na mapie Czechowickie Żule";
export const size = OG_SIZE;
export const contentType = "image/png";

export async function generateStaticParams() {
  const { people } = await getPublishedDataset();
  return people.map((person) => ({ slug: person.id }));
}

/** Dynamic "Poznaj: …" card with avatar initials and relationship count. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = await getPublishedGraphIndex();
  const person = index.people.get(slug);
  if (!person) {
    return renderOgCard({ eyebrow: "Czechowickie Żule", title: "Mapa Powiązań" });
  }
  const degree = index.adjacency.get(person.id)?.length ?? 0;
  return renderOgCard({
    eyebrow: "Poznaj",
    title: person.name,
    subtitle: [person.nickname && person.nickname !== person.name ? `„${person.nickname}”` : null, countLabel(degree, "relacja", "relacje", "relacji")]
      .filter(Boolean)
      .join(" · "),
    initials: initials(person.name),
    accent: PERSON_CATEGORIES[person.category].color,
    footer: `czechowickiezule.pl/osoba/${person.id}`,
  });
}
