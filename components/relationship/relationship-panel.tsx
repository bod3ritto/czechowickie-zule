import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Relationship } from "@/types/domain";
import type { GraphIndex } from "@/lib/graph/model";
import { commonNeighbors } from "@/lib/graph/algorithms";
import { CONFIDENCE_LABEL, RELATIONSHIP_TYPES, TONE_LABEL, isMystery } from "@/lib/relationship-types";
import { countLabel } from "@/lib/format";
import { personPath, relationshipPath } from "@/lib/site";
import { PanelSection, Eyebrow } from "@/components/ui/section";
import { LoreTimeline } from "@/components/ui/lore-timeline";
import { ShareButton } from "@/components/ui/share-button";
import { PersonAvatar } from "@/components/person/person-avatar";
import { RelationshipBadge } from "./relationship-badge";
import { ComparePathButton } from "./compare-path-button";
import { DraftNotice } from "@/components/ui/draft-notice";

interface RelationshipPanelProps {
  index: GraphIndex;
  relationship: Relationship;
  currentYear: number;
}

export function RelationshipPanel({ index, relationship, currentYear }: RelationshipPanelProps) {
  const a = index.people.get(relationship.personA)!;
  const b = index.people.get(relationship.personB)!;
  const meta = RELATIONSHIP_TYPES[relationship.type];
  const events = index.eventsByRelationship.get(relationship.id) ?? [];
  const common = commonNeighbors(index, a.id, b.id).map((id) => index.people.get(id)!);
  const years = relationship.since !== undefined ? (relationship.until ?? currentYear) - relationship.since : null;

  return (
    <article className="animate-fade-in">
      {relationship.status && relationship.status !== "published" && <DraftNotice />}
      <header className="pr-10">
        <Eyebrow>Relacja</Eyebrow>
        <div className="mt-4 flex items-center">
          {[a, b].map((p, i) => (
            <div key={p.id} className="flex items-center">
              {i === 1 && (
                <span className="mx-2 h-px w-10 sm:w-14" style={{ background: meta.color }} aria-hidden="true" />
              )}
              <Link
                href={personPath(p.id)}
                scroll={false}
                className="flex flex-col items-center gap-1.5 rounded-lg p-1 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-brand"
              >
                <PersonAvatar person={p} size="md" />
                <span className="text-xs font-medium text-fg">{p.name}</span>
              </Link>
            </div>
          ))}
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
          {a.name} <span className="text-fg-subtle">&</span> {b.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <RelationshipBadge relationship={relationship} />
          {relationship.tone && (
            <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
              {TONE_LABEL[relationship.tone]}
            </span>
          )}
        </div>
      </header>

      {isMystery(relationship) && (
        <p className="mt-5 rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-[13px] text-fg-muted">
          <span className="font-mono text-fg">?</span> Mystery connection — ta relacja nie jest potwierdzona. Traktuj ją jak plotkę.
        </p>
      )}

      <p className="mt-5 text-[15px] leading-relaxed text-fg">{relationship.description}</p>

      <dl className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line px-3 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">Od</dt>
          <dd className="mt-1 text-[15px] font-semibold text-fg">
            {relationship.since ?? "?"}
            {relationship.until && <span className="text-fg-muted"> – {relationship.until}</span>}
          </dd>
          <dd className="text-xs text-fg-muted">{years === null ? "data nieznana" : years > 0 ? countLabel(years, "rok", "lata", "lat") : "od niedawna"}</dd>
        </div>
        <div className="rounded-lg border border-line px-3 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">Siła relacji</dt>
          <dd className="mt-2.5">
            <span className="block h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round(relationship.strength * 100)}%`, background: meta.color }}
              />
            </span>
          </dd>
          <dd className="mt-1.5 font-mono text-[11px] text-fg-muted">{Math.round(relationship.strength * 100)}%</dd>
        </div>
        <div className="col-span-2 rounded-lg border border-line px-3 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">Pewność</dt>
          <dd className="mt-1 text-sm text-fg">{CONFIDENCE_LABEL[relationship.confidence ?? "confirmed"]}</dd>
        </div>
      </dl>

      {relationship.location && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-fg-muted">
          <MapPin className="size-3.5 text-fg-subtle" aria-hidden="true" />
          Ta historia wydarzyła się tutaj: <span className="text-fg">{relationship.location.name}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <ComparePathButton from={a.id} to={b.id} />
        <ShareButton path={relationshipPath(relationship.id)} title={`Czechowickie Żule — ${a.name} & ${b.name}`} />
      </div>

      <PanelSection title="Jak się poznali?">
        <LoreTimeline events={events} empty="Nikt nie pamięta. Albo nikt nie chce powiedzieć." />
      </PanelSection>

      <PanelSection title="Wspólni znajomi" aside={String(common.length)}>
        {common.length === 0 ? (
          <p className="text-sm text-fg-subtle">Brak wspólnych znajomych. Ich światy stykają się tylko tutaj.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-fg-muted">
              {a.name} i {b.name} mają {countLabel(common.length, "wspólnego znajomego", "wspólnych znajomych", "wspólnych znajomych")}.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {common.map((p) => (
                <li key={p.id}>
                  <Link
                    href={personPath(p.id)}
                    scroll={false}
                    className="flex items-center gap-1.5 rounded-md bg-white/[0.04] py-1 pl-1 pr-2 text-xs text-fg hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <PersonAvatar person={p} size="xs" />
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanelSection>
    </article>
  );
}
