import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <Logo className="mx-auto size-10" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nikt tu nikogo nie zna.</h1>
        <p className="mt-3 text-fg-muted">Tej osoby albo relacji nie ma na mapie. Jeszcze.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Link href="/" className={buttonClass("solid", "md")}>Wróć do mapy</Link>
          <Link href="/ludzie" className={buttonClass("outline", "md")}>Lista ludzi</Link>
        </div>
      </div>
    </main>
  );
}
