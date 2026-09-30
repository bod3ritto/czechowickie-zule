import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "O projekcie",
  description: "Czym jest mapa Czechowickie Żule, jak działa i jakie zasady obowiązują.",
  alternates: { canonical: "/o-projekcie" },
};

const features = [
  ["Mapa powiązań", "Interaktywny graf: kliknij osobę, żeby zobaczyć jej znajomych, znajomych znajomych i całe lore."],
  ["Ścieżka znajomości", "Wybierz dwie osoby, a mapa pokaże najkrótszy łańcuch znajomości i wspólnych znajomych."],
  ["Tryb skupienia", "Ukrywa wszystko poza 1. i 2. poziomem znajomości wybranej osoby."],
  ["Oś czasu i replay", "Przesuń rok albo puść animację i zobacz, jak sieć rosła z roku na rok."],
  ["Mystery connections", "Niepotwierdzone relacje są oznaczone przerywaną linią i znakiem zapytania."],
  ["Lore dnia", "Codziennie inna ciekawostka z życia lokalnej społeczności."],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">O projekcie</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Kto kogo zna w Czechowicach?</h1>
        <p className="mt-5 text-[17px] leading-relaxed text-fg-muted">
          <strong className="font-semibold text-fg">Czechowickie Żule</strong> to interaktywna mapa znajomości, historii i
          lokalnego lore Czechowic-Dziedzic. Coś pomiędzy grafem z Obsidiana, mapą relacji i kroniką osiedlowych
          legend — z przymrużeniem oka.
        </p>

        <section className="mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Co tu można zrobić</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map(([title, text]) => (
              <div key={title} className="rounded-xl border border-line bg-surface/60 p-4">
                <dt className="font-medium text-fg">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Zasady</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-fg-muted">
            <li>Obecne dane są <strong className="text-fg">w pełni fikcyjne</strong>. Imiona i historie to placeholdery.</li>
            <li>To nie jest ranking i nikt tu nikogo nie ocenia. Liczby opisują sieć, a nie ludzi.</li>
            <li>
              Prawdziwe osoby trafiają na mapę tylko za swoją zgodą i mogą w każdej chwili poprosić o zmianę lub usunięcie
              wpisu: przycisk <strong className="text-fg">„Zgłoś zmianę”</strong> w panelu osoby lub relacji (zakładka „Usuń mnie z
              mapy”). Nie trzeba zakładać konta ani podawać powodu.
            </li>
            <li>Żadnych adresów, numerów telefonów ani innych danych wrażliwych.</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Skróty</h2>
          <ul className="mt-4 space-y-2 font-mono text-sm text-fg-muted">
            <li><span className="text-fg">Ctrl/⌘ + K</span> — wyszukiwarka</li>
            <li><span className="text-fg">Esc</span> — zamknij panel / wyjdź z trybu skupienia</li>
            <li><span className="text-fg">Scroll / pinch</span> — zoom</li>
          </ul>
        </section>

        <Link href="/" className={buttonClass("solid", "md", "mt-12")}>
          Otwórz mapę
        </Link>
      </main>
    </>
  );
}
