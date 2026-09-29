"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Link2, Plus, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/admin/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/admin/ui/command";
import { normalizeText } from "@/lib/format";
import { useAdminData } from "@/components/admin/providers/admin-data";
import { useNavigationGuard } from "@/components/admin/providers/unsaved-changes";
import type { QuickAddKind } from "./quick-add";
import type { SearchItem } from "@/lib/queries/admin";

const GROUPS: { kind: SearchItem["kind"]; label: string; icon: typeof User }[] = [
  { kind: "person", label: "Osoby", icon: User },
  { kind: "relationship", label: "Relacje", icon: Link2 },
  { kind: "event", label: "Wydarzenia", icon: CalendarDays },
  { kind: "lore", label: "Lore", icon: BookOpen },
];

/** Ctrl/⌘+K: searches people, relationships, events and lore; plus quick actions. */
export function CommandPalette({
  open,
  onOpenChange,
  onQuickAdd,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onQuickAdd(kind: QuickAddKind): void;
}) {
  const router = useRouter();
  const guard = useNavigationGuard();
  const { searchIndex } = useAdminData();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return [];
    const words = q.split(/\s+/);
    return searchIndex.filter((item) => {
      const hay = normalizeText(`${item.title} ${item.keywords}`);
      return words.every((w) => hay.includes(w));
    });
  }, [searchIndex, query]);

  const go = (href: string) => {
    onOpenChange(false);
    setQuery("");
    guard(() => router.push(href));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuery(""); }}>
      <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Wyszukiwarka</DialogTitle>
        <DialogDescription className="sr-only">Szukaj osób, relacji, wydarzeń i lore.</DialogDescription>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Szukaj: osoby, relacje, wydarzenia, lore…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>Nic nie znaleziono.</CommandEmpty>
            {!query && (
              <CommandGroup heading="Szybkie akcje">
                <CommandItem onSelect={() => { onOpenChange(false); onQuickAdd("person"); }}>
                  <Plus /> Nowa osoba <CommandShortcut>N</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => { onOpenChange(false); onQuickAdd("relationship"); }}>
                  <Plus /> Nowa relacja <CommandShortcut>R</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => { onOpenChange(false); onQuickAdd("event"); }}>
                  <Plus /> Nowe wydarzenie <CommandShortcut>E</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => { onOpenChange(false); onQuickAdd("lore"); }}>
                  <Plus /> Nowe lore
                </CommandItem>
              </CommandGroup>
            )}
            {GROUPS.map(({ kind, label, icon: Icon }) => {
              const items = results.filter((r) => r.kind === kind).slice(0, 8);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={kind} heading={label}>
                  {items.map((item) => (
                    <CommandItem key={`${kind}-${item.id}`} value={`${kind}-${item.id}`} onSelect={() => go(item.href)}>
                      <Icon />
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && <span className="ml-auto truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
