"use client";

import { useState } from "react";
import { Hand, Move, MousePointerClick, ShieldAlert, UserX, ZoomIn } from "lucide-react";
import { useStoredFlag, writeStoredFlag } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { useMap } from "./map-context";

// v2: adds the "remove me from the map" notice, so everyone sees it once more.
const KEY = "cz-onboarding-v2-dismissed";

/** First-visit hint. Dismissal is remembered in localStorage. */
export function OnboardingHint() {
  const { canSubmit, openChangeRequest } = useMap();
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
        {canSubmit && (
          <div className="mt-5 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-fg">
              <ShieldAlert className="size-4 text-amber-300" aria-hidden="true" />
              Jesteś na mapie i coś Ci nie pasuje?
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
              Jeśli nie zgadzasz się z informacjami przedstawionymi na grafie, utwórz zgłoszenie z prośbą o usunięcie siebie z grafu. Poprawki
              zgłosisz przyciskiem „Zgłoś zmianę” w panelu osoby lub relacji.
            </p>
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                dismiss();
                openChangeRequest({ kind: "removal" });
              }}
            >
              <UserX className="size-3.5" />
              Zgłoś usunięcie siebie z grafu
            </Button>
          </div>
        )}
        <Button variant="solid" className="mt-5 w-full" onClick={dismiss} autoFocus>
          Rozumiem
        </Button>
      </section>
    </div>
  );
}
