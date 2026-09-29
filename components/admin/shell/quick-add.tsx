"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/admin/ui/sheet";
import { PersonForm } from "@/components/admin/forms/person-form";
import { RelationshipForm } from "@/components/admin/forms/relationship-form";
import { EventForm } from "@/components/admin/forms/event-form";
import { LoreForm } from "@/components/admin/forms/lore-form";

export type QuickAddKind = "person" | "relationship" | "event" | "lore";

interface QuickAddRequest {
  kind: QuickAddKind;
  /** Person(s) to preselect, e.g. when adding from a profile or the graph. */
  personA?: string;
  personB?: string;
  lockPersonA?: boolean;
  onSaved?: (id: string) => void;
}

const QuickAddContext = createContext<((request: QuickAddRequest) => void) | null>(null);

const TITLES: Record<QuickAddKind, { title: string; description: string; full: string }> = {
  person: { title: "Nowa osoba", description: "Najważniejsze pola — resztę uzupełnisz później w profilu.", full: "/admin/people/new" },
  relationship: { title: "Nowa relacja", description: "Wybierz dwie osoby i opisz, jak się znają.", full: "/admin/relationships/new" },
  event: { title: "Nowe wydarzenie", description: "Dodaj wydarzenie i jego uczestników.", full: "/admin/events/new" },
  lore: { title: "Nowe lore", description: "Historia, ciekawostka, cytat albo plotka.", full: "/admin/lore/new" },
};

/**
 * "+" from anywhere: a side sheet with a compact form, so adding something
 * never takes more than one screen.
 */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [request, setRequest] = useState<QuickAddRequest | null>(null);
  const open = useCallback((r: QuickAddRequest) => setRequest(r), []);
  const close = () => setRequest(null);

  const saved = (id: string) => {
    const r = request;
    close();
    if (r?.onSaved) r.onSaved(id);
    else if (r?.kind === "person") router.push(`/admin/people/${id}`);
  };

  const meta = request ? TITLES[request.kind] : null;

  return (
    <QuickAddContext.Provider value={open}>
      {children}
      <Sheet open={request !== null} onOpenChange={(o) => !o && close()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {request && meta && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle>{meta.title}</SheetTitle>
                <SheetDescription>
                  {meta.description}{" "}
                  <Link href={meta.full} onClick={close} className="underline underline-offset-2">
                    Pełny formularz
                  </Link>
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                {request.kind === "person" && <PersonForm compact onSaved={saved} />}
                {request.kind === "relationship" && (
                  <RelationshipForm
                    compact
                    prefill={{ personA: request.personA, personB: request.personB }}
                    lockPersonA={request.lockPersonA}
                    onSaved={saved}
                    onEditExisting={(id) => {
                      close();
                      router.push(`/admin/relationships/${id}`);
                    }}
                  />
                )}
                {request.kind === "event" && <EventForm compact prefillPeople={request.personA ? [request.personA] : []} onSaved={saved} />}
                {request.kind === "lore" && <LoreForm compact prefillPeople={request.personA ? [request.personA] : []} onSaved={saved} />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("QuickAddProvider missing");
  return ctx;
}
