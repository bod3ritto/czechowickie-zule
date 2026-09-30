"use client";

import Link from "next/link";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/admin/ui/badge";
import { formatDate } from "@/components/admin/common/layout";
import { useConfirm } from "@/components/admin/providers/confirm";
import { useCanDelete } from "@/components/admin/providers/admin-data";
import { useServerAction } from "@/components/admin/hooks/use-server-action";
import { approveSubmissions } from "@/lib/actions/review";
import { deletePeople } from "@/lib/actions/people";
import { deleteRelationships } from "@/lib/actions/relationships";
import { deleteLore } from "@/lib/actions/lore";
import { deleteEvents } from "@/lib/actions/events";
import type { PendingPerson, PendingRelationship, PendingStory } from "@/lib/queries/admin";
import { LORE_TYPE_LABEL, PERSON_CATEGORIES, RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { countLabel } from "@/lib/format";

export function SubmissionsQueue({
  people,
  relationships,
  stories = [],
}: {
  people: PendingPerson[];
  relationships: PendingRelationship[];
  stories?: PendingStory[];
}) {
  const { run, pending } = useServerAction();
  const confirm = useConfirm();
  const canDelete = useCanDelete();

  if (people.length + relationships.length + stories.length === 0) return null;

  const approveAll = () =>
    run(() =>
      approveSubmissions({
        people: people.map((p) => p.id),
        relationships: [...people.flatMap((p) => p.relationships.map((r) => r.id)), ...relationships.map((r) => r.id)],
        lore: stories.filter((s) => s.kind === "lore").map((s) => s.id),
        events: stories.filter((s) => s.kind === "event").map((s) => s.id),
      }),
    );

  const rejectPerson = async (p: PendingPerson) => {
    const ok = await confirm({
      title: `Odrzucić zgłoszenie: ${p.first_name}?`,
      description:
        p.relationships.length > 0
          ? `Osoba zostanie usunięta razem z ${countLabel(p.relationships.length, "zgłoszoną relacją", "zgłoszonymi relacjami", "zgłoszonymi relacjami")}.`
          : "Zgłoszenie zostanie usunięte.",
      confirmLabel: "Odrzuć",
      destructive: true,
    });
    if (ok)
      await run(() => deletePeople({ ids: [p.id] }), {
        success: "Odrzucono zgłoszenie.",
      });
  };

  const rejectRelationship = async (r: PendingRelationship) => {
    const ok = await confirm({
      title: `Odrzucić relację ${r.personA.name} ↔ ${r.personB.name}?`,
      description: "Zgłoszenie zostanie usunięte.",
      confirmLabel: "Odrzuć",
      destructive: true,
    });
    if (ok)
      await run(() => deleteRelationships({ ids: [r.id] }), {
        success: "Odrzucono zgłoszenie.",
      });
  };

  const rejectStory = async (s: PendingStory) => {
    const ok = await confirm({
      title: s.kind === "lore" ? "Odrzucić zgłoszone lore?" : `Odrzucić wydarzenie „${s.title}”?`,
      description: "Zgłoszenie zostanie usunięte.",
      confirmLabel: "Odrzuć",
      destructive: true,
    });
    if (ok) await run(() => (s.kind === "lore" ? deleteLore({ ids: [s.id] }) : deleteEvents({ ids: [s.id] })), { success: "Odrzucono zgłoszenie." });
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Czeka:{" "}
          {[
            [people.length, "osoba", "osoby", "osób"] as const,
            [relationships.length + people.reduce((n, p) => n + p.relationships.length, 0), "relacja", "relacje", "relacji"] as const,
            [stories.length, "historia", "historie", "historii"] as const,
          ]
            .filter(([count]) => count > 0)
            .map(([count, one, few, many]) => countLabel(count, one, few, many))
            .join(", ")}
        </p>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => void approveAll()}>
          <Check /> Zatwierdź wszystkie
        </Button>
      </div>

      {people.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">Nowe osoby</h2>
          {people.map((p) => (
            <article key={p.id} className="rounded-lg border bg-card p-4" aria-label={`Zgłoszenie: ${p.first_name}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-medium">
                    {p.first_name}
                    {p.nickname && p.nickname !== p.first_name && <span className="font-normal text-muted-foreground"> „{p.nickname}”</span>}
                  </h3>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{PERSON_CATEGORIES[p.category].label}</Badge>
                    <span>{formatDate(p.submitted_at, true)}</span>
                    {p.submitted_by && <span>· od: {p.submitted_by}</span>}
                  </p>
                  {p.bio && <p className="mt-2 whitespace-pre-line text-sm">{p.bio}</p>}
                  {p.relationships.length > 0 && (
                    <ul className="mt-3 grid gap-1.5">
                      {p.relationships.map((r) => (
                        <RelationshipLine key={r.id} r={r} />
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/admin/people/${p.id}`}>
                      <Pencil /> Edytuj
                    </Link>
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => void rejectPerson(p)}>
                      <X /> Odrzuć
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      void run(() =>
                        approveSubmissions({
                          people: [p.id],
                          relationships: p.relationships.map((r) => r.id),
                        }),
                      )
                    }
                  >
                    <Check /> Zatwierdź
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {relationships.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">Nowe relacje</h2>
          {relationships.map((r) => (
            <article
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
              aria-label={`Zgłoszenie: ${r.personA.name} ↔ ${r.personB.name}`}
            >
              <div className="min-w-0">
                <RelationshipLine r={r} heading />
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(r.submitted_at, true)}
                  {r.submitted_by && <> · od: {r.submitted_by}</>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/admin/relationships/${r.id}`}>
                    <Pencil /> Edytuj
                  </Link>
                </Button>
                {canDelete && (
                  <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => void rejectRelationship(r)}>
                    <X /> Odrzuć
                  </Button>
                )}
                <Button size="sm" disabled={pending} onClick={() => void run(() => approveSubmissions({ relationships: [r.id] }))}>
                  <Check /> Zatwierdź
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {stories.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">Nowe lore i wydarzenia</h2>
          {stories.map((s) => (
            <article
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
              aria-label={`Zgłoszenie: ${s.title ?? (s.text ?? "").slice(0, 40)}`}
            >
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 font-medium">
                  {s.title ?? (s.kind === "lore" ? "Lore bez tytułu" : "Wydarzenie")}
                  <Badge variant="outline">{s.kind === "lore" ? (s.loreType ? LORE_TYPE_LABEL[s.loreType] : "Lore") : "Wydarzenie"}</Badge>
                  {s.year && <span className="text-xs font-normal text-muted-foreground">{s.year}</span>}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(s.submitted_at, true)}
                  {s.submitted_by && <> · od: {s.submitted_by}</>}
                </p>
                {s.text && <p className="mt-2 whitespace-pre-line text-sm">{s.text}</p>}
                {s.people.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.kind === "lore" ? "Dotyczy" : "Uczestnicy"}: <span className="text-foreground">{s.people.join(", ")}</span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={s.kind === "lore" ? `/admin/lore/${s.id}` : `/admin/events/${s.id}`}>
                    <Pencil /> Edytuj
                  </Link>
                </Button>
                {canDelete && (
                  <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => void rejectStory(s)}>
                    <X /> Odrzuć
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => void run(() => approveSubmissions(s.kind === "lore" ? { lore: [s.id] } : { events: [s.id] }))}
                >
                  <Check /> Zatwierdź
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function RelationshipLine({ r, heading }: { r: PendingRelationship; heading?: boolean }) {
  const meta = RELATIONSHIP_TYPES[r.type];
  const hidden = [r.personA, r.personB].filter((p) => p.status !== "published");
  return (
    <li className="list-none text-sm">
      <span className={heading ? "font-medium" : undefined}>
        {r.personA.name} ↔ {r.personB.name}
      </span>{" "}
      <span className="text-xs" style={{ color: meta.color }}>
        {meta.label}
      </span>
      {r.since_year && <span className="text-xs text-muted-foreground"> · od {r.since_year}</span>}
      {r.description && <p className="text-muted-foreground">{r.description}</p>}
      {heading && hidden.length > 0 && (
        <p className="text-xs text-amber-400">
          {hidden.map((p) => p.name).join(", ")} nie jest opublikowany — relacja nie będzie widoczna, dopóki to się nie zmieni.
        </p>
      )}
    </li>
  );
}
