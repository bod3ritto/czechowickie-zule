import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { countSubmissions, getDashboard, getNetwork } from "@/lib/queries/admin";
import { AdminPageHeader, Section, formatDate } from "@/components/admin/common/layout";
import { StatusBadge } from "@/components/admin/common/badges";
import { AuditList } from "@/components/admin/audit-list";
import { MiniGraph } from "@/components/admin/graph/mini-graph";
import { QuickActions } from "@/components/admin/quick-actions";
import { Button } from "@/components/admin/ui/button";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { countLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [data, network, pending] = await Promise.all([getDashboard(), getNetwork(), countSubmissions()]);
  const name = new Map(network.people.map((p) => [p.id, p.name]));

  const stats = [
    { label: "Osoby", value: data.counts.people, href: "/admin/people" },
    { label: "Relacje", value: data.counts.relationships, href: "/admin/relationships" },
    { label: "Wydarzenia", value: data.counts.events, href: "/admin/events" },
    { label: "Lore", value: data.counts.lore, href: "/admin/lore" },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <AdminPageHeader title="Dashboard" description="Stan mapy powiązań. Liczby nie obejmują archiwum." actions={<QuickActions />} />

      {pending > 0 && (
        <Link
          href="/admin/submissions"
          className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm transition-colors hover:border-amber-500/60"
        >
          <Inbox className="size-4 text-amber-400" />
          <span className="flex-1">
            <strong className="font-medium">{countLabel(pending, "zgłoszenie czeka", "zgłoszenia czekają", "zgłoszeń czeka")}</strong> na
            sprawdzenie.
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg border bg-card px-4 py-3 transition-colors hover:border-ring">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section
          title="Podgląd sieci"
          description="Kliknij osobę lub relację, żeby ją edytować."
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/graph">
                Pełny graf <ArrowRight />
              </Link>
            </Button>
          }
        >
          <MiniGraph />
        </Section>
        <Section
          title="Ostatnie zmiany"
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/audit">
                Historia <ArrowRight />
              </Link>
            </Button>
          }
        >
          <AuditList rows={data.audit} />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Najnowsze osoby">
          <ul className="grid gap-2">
            {data.recentPeople.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/admin/people/${p.id}`} className="truncate hover:underline">
                  {p.first_name}
                  {p.nickname && p.nickname !== p.first_name && <span className="text-muted-foreground"> „{p.nickname}”</span>}
                </Link>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Najnowsze relacje">
          <ul className="grid gap-2">
            {data.recentRelationships.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/admin/relationships/${r.id}`} className="truncate hover:underline">
                  {name.get(r.person_a)} ↔ {name.get(r.person_b)}
                </Link>
                <span className="shrink-0 text-xs" style={{ color: RELATIONSHIP_TYPES[r.type].color }}>
                  {RELATIONSHIP_TYPES[r.type].label}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Ostatnio dodane wydarzenia">
          <ul className="grid gap-2">
            {data.recentEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/admin/events/${e.id}`} className="truncate hover:underline">
                  {e.title}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{e.year ?? formatDate(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
