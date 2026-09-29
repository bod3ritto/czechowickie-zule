import type { Metadata } from "next";
import { getGraphIndex } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { PeopleDirectory, type DirectoryEntry } from "@/components/person/people-directory";

export const metadata: Metadata = {
  title: "Ludzie",
  description: "Lista wszystkich osób na mapie powiązań Czechowic-Dziedzic.",
  alternates: { canonical: "/ludzie" },
};

export default async function PeoplePage() {
  const index = await getGraphIndex();
  const entries: DirectoryEntry[] = [...index.dataset.people]
    .sort((a, b) => a.name.localeCompare(b.name, "pl"))
    .map((person) => ({
      person,
      degree: index.adjacency.get(person.id)?.length ?? 0,
      events: index.eventsByPerson.get(person.id)?.length ?? 0,
    }));

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Katalog</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Ludzie</h1>
        <p className="mt-3 max-w-xl text-fg-muted">
          Wszyscy, którzy pojawiają się na mapie. Kliknij osobę, żeby zobaczyć ją w grafie razem z jej powiązaniami.
        </p>
        <PeopleDirectory entries={entries} />
      </main>
    </>
  );
}
