"use client";

import { useState } from "react";
import { Hand, Move, MousePointerClick, ZoomIn } from "lucide-react";
import { useStoredFlag, writeStoredFlag } from "@/lib/hooks";
import { Button } from "@/components/ui/button";

const KEY = "cz-onboarding-dismissed";

/** First-visit hint. Dismissal is remembered in localStorage. */
export function OnboardingHint() {
  // Server snapshot = "dismissed" so nothing renders during SSR.
  const stored = useStoredFlag(KEY, true);
  const [dismissedNow, setDismissedNow] = useState(false);
  if (stored || dismissedNow) return null;

  const dismiss = () => {
    writeStoredFlag(KEY);
    setDismissedNow(true);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-4">
      <section
        aria-label="Jak korzystać z mapy"
        className="animate-pop pointer-events-auto w-full max-w-sm rounded-xl border border-line bg-surface/95 p-5 shadow-2xl shadow-black/70 backdrop-blur"
      >
        <p className="text-[15px] font-semibold tracking-tight text-fg">Kliknij osobę, żeby zobaczyć jej powiązania.</p>
        <ul className="mt-4 space-y-2.5 text-sm text-fg-muted">
          <li className="flex items-center gap-3">
            <ZoomIn className="size-4 text-fg-subtle" aria-hidden="true" />
            <span><span className="hidden sm:inline">Scroll</span><span className="sm:hidden">Uszczypnij</span> — zoom</span>
          </li>
          <li className="flex items-center gap-3">
            <Move className="size-4 text-fg-subtle" aria-hidden="true" />
            Przeciągnij — przesuń mapę
          </li>
          <li className="flex items-center gap-3">
            <MousePointerClick className="size-4 text-fg-subtle" aria-hidden="true" />
            <span><span className="hidden sm:inline">Kliknij</span><span className="sm:hidden">Dotknij</span> — szczegóły osoby lub relacji</span>
          </li>
          <li className="flex items-center gap-3">
            <Hand className="size-4 text-fg-subtle" aria-hidden="true" />
            Złap osobę — przestaw ją na mapie
          </li>
        </ul>
        <Button variant="solid" className="mt-5 w-full" onClick={dismiss} autoFocus>
          Rozumiem
        </Button>
      </section>
    </div>
  );
}
