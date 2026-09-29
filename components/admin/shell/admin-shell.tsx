"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  History,
  LayoutDashboard,
  Link2,
  LogOut,
  MapPin,
  Menu,
  Network,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Toaster } from "@/components/admin/ui/sonner";
import { TooltipProvider } from "@/components/admin/ui/tooltip";
import { Button } from "@/components/admin/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/admin/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { AdminDataProvider, type LocationOption } from "@/components/admin/providers/admin-data";
import { ConfirmProvider } from "@/components/admin/providers/confirm";
import { UnsavedChangesProvider } from "@/components/admin/providers/unsaved-changes";
import { QuickAddProvider, useQuickAdd, type QuickAddKind } from "./quick-add";
import { CommandPalette } from "./command-palette";
import type { Network as NetworkData } from "@/lib/admin/network";
import type { SearchItem } from "@/lib/queries/admin";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/graph", label: "Graf", icon: Network },
  { href: "/admin/people", label: "Osoby", icon: Users },
  { href: "/admin/relationships", label: "Relacje", icon: Link2 },
  { href: "/admin/events", label: "Wydarzenia", icon: CalendarDays },
  { href: "/admin/lore", label: "Lore", icon: BookOpen },
  { href: "/admin/locations", label: "Lokalizacje", icon: MapPin },
];

const SECONDARY = [
  { href: "/admin/audit", label: "Historia zmian", icon: History },
  { href: "/admin/settings", label: "Ustawienia", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = ({ href, label, icon: Icon, exact }: (typeof NAV)[number] & { exact?: boolean }) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <li key={href}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Panel administracyjny" className="flex flex-1 flex-col gap-4 px-3 py-3">
      <ul className="grid gap-0.5">{NAV.map(item)}</ul>
      <div className="mt-auto grid gap-0.5">
        <div className="mx-2.5 mb-2 border-t" />
        <ul className="grid gap-0.5">{SECONDARY.map((s) => item({ ...s, exact: false }))}</ul>
        <form action={signOut}>
          <button type="submit" className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <LogOut className="size-4" /> Wyloguj
          </button>
        </form>
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2">
      <Logo className="size-7" />
      <span className="text-sm font-semibold tracking-tight">Czechowickie Żule</span>
      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">admin</span>
    </Link>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || Boolean(target.closest("[role=combobox], [cmdk-input]"));
}

function ShellChrome({ children, adminEmail }: { children: ReactNode; adminEmail: string }) {
  const quickAdd = useQuickAdd();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const add = (kind: QuickAddKind) => quickAdd({ kind });

  // Global shortcuts: Ctrl/⌘+K search; N/R/E new person/relationship/event.
  // Letters are ignored while typing or when a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      const map: Record<string, QuickAddKind> = { n: "person", r: "relationship", e: "event" };
      const kind = map[e.key.toLowerCase()];
      if (kind) {
        e.preventDefault();
        quickAdd({ kind });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickAdd]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            <Brand />
          </div>
          <NavLinks onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Otwórz menu">
            <Menu />
          </Button>
          <div className="lg:hidden">
            <Logo className="size-7" />
          </div>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="ml-auto flex h-9 items-center gap-2 rounded-md border bg-input/30 px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:w-72 lg:ml-0"
            aria-label="Szukaj (Ctrl+K)"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">Szukaj…</span>
            <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </button>

          <div className="flex items-center gap-2 lg:ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" aria-label="Szybkie dodawanie">
                  <Plus />
                  <span className="hidden sm:inline">Dodaj</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => add("person")}>
                  <Users /> Nowa osoba <DropdownMenuShortcut>N</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => add("relationship")}>
                  <Link2 /> Nowa relacja <DropdownMenuShortcut>R</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => add("event")}>
                  <CalendarDays /> Nowe wydarzenie <DropdownMenuShortcut>E</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => add("lore")}>
                  <BookOpen /> Nowe lore
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Konto">
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase">{adminEmail.slice(0, 1) || "A"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-xs text-muted-foreground">Zalogowano jako</span>
                  <span className="block truncate">{adminEmail}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/" target="_blank" rel="noreferrer">
                    <ExternalLink /> Publiczna strona
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings /> Ustawienia
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut /> Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} onQuickAdd={add} />
    </div>
  );
}

export function AdminShell({
  network,
  locations,
  searchIndex,
  adminEmail,
  children,
}: {
  network: NetworkData;
  locations: LocationOption[];
  searchIndex: SearchItem[];
  adminEmail: string;
  children: ReactNode;
}) {
  return (
    <AdminDataProvider network={network} locations={locations} searchIndex={searchIndex} adminEmail={adminEmail}>
      <TooltipProvider>
        <ConfirmProvider>
          <UnsavedChangesProvider>
            <QuickAddProvider>
              <ShellChrome adminEmail={adminEmail}>{children}</ShellChrome>
            </QuickAddProvider>
          </UnsavedChangesProvider>
        </ConfirmProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </AdminDataProvider>
  );
}
