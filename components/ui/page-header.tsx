import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./logo";
import { buttonClass } from "./button";

/** Header for regular content pages (outside the full-screen map). */
export function PageHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-brand">
          <Logo className="size-7" />
          <span className="text-sm font-semibold tracking-tight">Czechowickie Żule</span>
        </Link>
        <nav aria-label="Główna" className="flex items-center gap-1">
          <Link href="/ludzie" className={buttonClass("ghost", "sm")}>Ludzie</Link>
          <Link href="/o-projekcie" className={buttonClass("ghost", "sm")}>O projekcie</Link>
          <Link href="/" className={buttonClass("outline", "sm")}>
            <ArrowLeft className="size-3.5" />
            Mapa
          </Link>
        </nav>
      </div>
    </header>
  );
}
