"use client";

import Link from "next/link";
import {
  BarChart3,
  Dices,
  Focus,
  History,
  Info,
  ListFilter,
  Menu,
  Plus,
  Route,
  Search,
  Users,
} from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover } from "@/components/ui/popover";
import { FILTERS } from "@/lib/relationship-types";
import { cn } from "@/lib/format";
import { Logo } from "@/components/ui/logo";
import { useMap } from "./map-context";
import { FilterChips } from "./filter-chips";
import { Legend } from "./legend";

export function TopBar() {
  const map = useMap();
  const personSelected = map.selection?.kind === "person";
  const activeFilter = FILTERS.find((f) => f.key === map.filter);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-3">
        <Link
          href="/"
          onClick={() => map.showPath(null)}
          className="group flex items-center gap-2.5 rounded-lg pr-2 focus-visible:outline-2 focus-visible:outline-brand"
          aria-label="Czechowickie Żule — strona główna"
        >
          <Logo className="size-8" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[15px] font-semibold tracking-tight text-fg">Czechowickie Żule</span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">mapa powiązań</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Narzędzia mapy" className="pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={map.openSearch}
          className={buttonClass("outline", "md", "w-9 justify-center px-0 md:w-56 md:justify-between md:px-3")}
          aria-label="Szukaj osoby (Ctrl+K)"
        >
          <span className="flex items-center gap-2">
            <Search className="size-4" />
            <span className="hidden md:inline">Szukaj osoby…</span>
          </span>
          <span className="hidden items-center gap-0.5 md:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        {map.canSubmit && (
          <Button
            size="md"
            variant="solid"
            onClick={() => map.openSubmit("person")}
            aria-label="Dodaj osobę lub relację"
            title="Zaproponuj osobę lub relację — pojawi się po zatwierdzeniu"
            className="px-0 w-9 md:w-auto md:px-3"
          >
            <Plus className="size-4" />
            <span className="hidden md:inline">Dodaj</span>
          </Button>
        )}

        <Button size="md" onClick={map.randomPerson} aria-label="Losuj osobę" className="px-0 w-9 lg:w-auto lg:px-3">
          <Dices className="size-4" />
          <span className="hidden lg:inline">Losuj osobę</span>
        </Button>

        <Popover
          label="Filtr relacji"
          className="w-72"
          trigger={(props) => (
            <Button {...props} size="md" aria-label="Filtr relacji" pressed={map.filter !== "all"} className="px-0 w-9 lg:w-auto lg:px-3">
              <ListFilter className="size-4" />
              <span className="hidden lg:inline">{map.filter === "all" ? "Filtr" : activeFilter?.label}</span>
            </Button>
          )}
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Pokaż relacje</p>
          <FilterChips />
        </Popover>

        <Popover
          label="Legenda"
          className="hidden w-72 sm:block"
          trigger={(props) => (
            <Button {...props} size="icon" aria-label="Legenda" className="hidden sm:inline-flex">
              <Info className="size-4" />
            </Button>
          )}
        >
          <Legend />
        </Popover>

        <Button
          size="md"
          onClick={() => map.setFocusMode(!map.focusMode)}
          disabled={!personSelected}
          pressed={map.focusMode}
          aria-label="Tryb skupienia"
          title={personSelected ? "Pokaż tylko 1. i 2. poziom znajomości" : "Wybierz osobę, aby włączyć tryb skupienia"}
          className="hidden px-0 w-9 sm:inline-flex xl:w-auto xl:px-3"
        >
          <Focus className="size-4" />
          <span className="hidden xl:inline">Tryb skupienia</span>
        </Button>

        <Popover
          label="Więcej"
          className="w-64 p-1.5"
          trigger={(props) => (
            <Button {...props} size="icon" aria-label="Więcej opcji">
              <Menu className="size-4" />
            </Button>
          )}
        >
          {(close) => (
            <ul className="flex flex-col text-sm">
              <MenuItem
                icon={<Route className="size-4" />}
                label="Ścieżka znajomości"
                hint="Jak A zna B?"
                onClick={() => {
                  close();
                  map.openPathTool(personSelected && map.selection ? map.selection.id : undefined);
                }}
              />
              <MenuItem
                icon={<History className="size-4" />}
                label={map.timelineOpen ? "Zamknij oś czasu" : "Oś czasu"}
                hint="Replay sieci"
                onClick={() => {
                  close();
                  map.setTimelineOpen(!map.timelineOpen);
                }}
              />
              <MenuItem
                icon={<BarChart3 className="size-4" />}
                label="Sieć w liczbach"
                onClick={() => {
                  close();
                  map.openNetworkStats();
                }}
              />
              <MenuItem
                icon={<Focus className="size-4" />}
                label={map.focusMode ? "Wyłącz tryb skupienia" : "Tryb skupienia"}
                className="sm:hidden"
                disabled={!personSelected}
                onClick={() => {
                  close();
                  map.setFocusMode(!map.focusMode);
                }}
              />
              <li className="my-1 border-t border-line sm:hidden" role="separator" />
              <li className="px-2.5 py-2 sm:hidden">
                <Legend />
              </li>
              <li className="my-1 border-t border-line" role="separator" />
              <li>
                <Link href="/ludzie" className={menuItemClass}>
                  <Users className="size-4" /> Wszyscy ludzie
                </Link>
              </li>
              <li>
                <Link href="/o-projekcie" className={menuItemClass}>
                  <Info className="size-4" /> O projekcie
                </Link>
              </li>
            </ul>
          )}
        </Popover>
      </nav>
    </header>
  );
}

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40 disabled:pointer-events-none";

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick(): void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <li className={className}>
      <button type="button" onClick={onClick} disabled={disabled} className={menuItemClass}>
        {icon}
        <span className="flex-1">{label}</span>
        {hint && <span className={cn("font-mono text-[10px] text-fg-subtle")}>{hint}</span>}
      </button>
    </li>
  );
}
