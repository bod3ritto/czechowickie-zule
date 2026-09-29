import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Person } from "@/types/domain";
import type { GraphIndex } from "@/lib/graph/model";
import { personStats } from "@/lib/graph/stats";
import { PERSON_CATEGORIES } from "@/lib/relationship-types";
import { countLabel } from "@/lib/format";
import { personPath, relationshipPath } from "@/lib/site";
import { PanelSection } from "@/components/ui/section";
import { LoreTimeline } from "@/components/ui/lore-timeline";
import { RelationshipBadge } from "@/components/relationship/relationship-badge";
import { PersonAvatar } from "./person-avatar";
import { PersonActions } from "./person-actions";
import { LoreMeta } from "@/components/ui/lore-meta";
import { DraftNotice } from "@/components/ui/draft-notice";

interface PersonPanelProps {
  index: GraphIndex;
  person: Person;
  currentYear: number;
}

/** Server-rendered profile: fully indexable, and it streams into the side panel. */
export function PersonPanel({ index, person, currentYear }: PersonPanelProps) {
  const edges = [...(index.adjacency.get(person.id) ?? [])].sort(
    (a, b) => b.relationship.strength - a.relationship.strength,
  );
  const stats = personStats(index, person, currentYear);
  const events = index.eventsByPerson.get(person.id) ?? [];
  const loreEntries = index.loreByPerson.get(person.id) ?? [];
  const category = PERSON_CATEGORIES[person.category];
  const longestOther = stats.longest && index.people.get(stats.longest.other);

  return (
    <article className="animate-fade-in">
      {person.status && person.status !== "published" && <DraftNotice />}
      <header className="pr-10">
        <PersonAvatar person={person} size="lg" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">{person.name}</h1>
        {person.nickname && person.nickname !== person.name && (
          <p className="mt-0.5 font-mono text-sm text-fg-muted">„{person.nickname}”</p>
        )}
        <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          <span className="size-1.5 rounded-full" style={{ background: category.color }} aria-hidden="true" />
          {category.label}
          {person.firstSeen && <span>· na mapie od {person.firstSeen}</span>}
        </p>
      </header>

      <div className="mt-5 space-y-3 text-[15px] leading-relaxed">
        <p className="text-fg">{person.bio}</p>
        {person.legend && (
          <blockquote className="border-l-2 border-brand/50 pl-3 text-[14px] italic text-fg-muted">{person.legend}</blockquote>
        )}
      </div>

      <div className="mt-5">
        <PersonActions personId={person.id} name={person.name} />
      </div>

      <PanelSection title="Powiązania" aside={countLabel(edges.length, "relacja", "relacje", "relacji")}>
        {edges.length === 0 ? (
          <p className="text-sm text-fg-subtle">Samotny wilk. Na razie bez powiązań.</p>
        ) : (
          <ul className="-mx-2 space-y-0.5">
            {edges.map(({ neighbor, relationship }) => {
              const other = index.people.get(neighbor)!;
              return (
                <li key={relationship.id}>
                  <Link
                    href={relationshipPath(relationship.id)}
                    scroll={false}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <PersonAvatar person={other} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-fg">{other.name}</span>
                        <RelationshipBadge relationship={relationship} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-fg-muted">
                        {relationship.since ? `od ${relationship.since} · ` : ""}
                        {relationship.description}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="Statystyki">
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="Znajomi" value={String(stats.friends)} />
          <Stat label="Relacje" value={String(stats.relationships)} />
          <Stat
            label="Najdłuższa znajomość"
            value={stats.longest ? countLabel(stats.longest.years, "rok", "lata", "lat") : "—"}
            detail={
              longestOther ? (
                <Link href={personPath(longestOther.id)} scroll={false} className="hover:text-fg hover:underline">
                  z: {longestOther.name}
                </Link>
              ) : undefined
            }
          />
          <Stat label="Najczęstszy typ" value={stats.topType?.label ?? "—"} />
          <Stat
            label="Poziom legendy"
            value={`${"●".repeat(stats.legend.level)}${"○".repeat(5 - stats.legend.level)}`}
            detail={stats.legend.label}
            className="col-span-2"
          />
        </dl>
      </PanelSection>

      {loreEntries.length > 0 && (
        <PanelSection title="Ciekawostki i lore" aside={String(loreEntries.length)}>
          <ul className="space-y-2">
            {loreEntries.map((entry) => (
              <li key={entry.id} className="rounded-lg bg-white/[0.03] px-3 py-2.5">
                {entry.title && <p className="mb-0.5 text-[13px] font-medium text-fg">{entry.title}</p>}
                <p className="text-[13px] leading-relaxed text-fg">{entry.content}</p>
                <LoreMeta type={entry.type} confidence={entry.confidence} year={entry.year} />
              </li>
            ))}
          </ul>
        </PanelSection>
      )}

      <PanelSection title="Lore" aside={events.length > 0 ? countLabel(events.length, "wydarzenie", "wydarzenia", "wydarzeń") : undefined}>
        <LoreTimeline events={events} empty="Historia tej osoby dopiero się pisze." />
      </PanelSection>
    </article>
  );
}

function Stat({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-line px-3 py-2.5 ${className ?? ""}`}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold tracking-tight text-fg">{value}</dd>
      {detail && <dd className="mt-0.5 text-xs text-fg-muted">{detail}</dd>}
    </div>
  );
}
