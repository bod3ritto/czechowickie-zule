import type { Metadata } from "next";
import Link from "next/link";
import { getDataset } from "@/lib/data";
import { personPath, site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * The home page is the graph itself (rendered by the layout). This content is
 * visually hidden and exists for screen readers and search engines.
 */
export default async function HomePage() {
  const { people } = await getDataset();
  return (
    <div className="sr-only">
      <h1>{site.title}</h1>
      <p>{site.description}</p>
      <nav aria-label="Osoby na mapie">
        <ul>
          {people.map((person) => (
            <li key={person.id}>
              <Link href={personPath(person.id)}>
                {person.name}
                {person.nickname ? ` „${person.nickname}”` : ""}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link href="/ludzie">Lista wszystkich osób</Link>
      <Link href="/o-projekcie">O projekcie</Link>
    </div>
  );
}
