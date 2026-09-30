import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { mediaPublicUrl } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import type {
  AuditLogRow,
  ChangeRequestRow,
  EventRow,
  LocationRow,
  LoreRow,
  MediaRow,
  PersonRow,
  RelationshipRow,
} from "@/lib/db/database.types";
import type { Network, NetworkPerson, NetworkRelationship } from "@/lib/admin/network";

/**
 * Read-side for the admin panel. Always runs with the admin's session, so
 * RLS applies. Callers must have passed `requireAdmin()` (the admin layout
 * does that for every page).
 */

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) {
    console.error(`[admin query] ${what}:`, result.error.message);
    throw new Error(`Nie udało się wczytać: ${what}.`);
  }
  return result.data as T;
}

export type MediaItem = MediaRow & { url: string };

const withUrl = (m: MediaRow): MediaItem => ({ ...m, url: mediaPublicUrl(m.storage_path) });

// ---------------------------------------------------------------- network ----
export const getNetwork = cache(async (): Promise<Network> => {
  const db = await createSessionClient();
  const [people, rels, avatars] = await Promise.all([
    db.from("people").select("id, slug, first_name, last_name, nickname, aliases, category, status, bio").order("first_name"),
    db.from("relationships").select("id, slug, person_a, person_b, type, strength, since_year, since_date, status"),
    db.from("media").select("person_id, storage_path, is_primary, created_at").eq("kind", "avatar").not("person_id", "is", null),
  ]);
  const avatarByPerson = new Map<string, { path: string; primary: boolean }>();
  for (const m of must(avatars, "zdjęcia")) {
    if (!m.person_id) continue;
    const current = avatarByPerson.get(m.person_id);
    if (!current || (m.is_primary && !current.primary)) avatarByPerson.set(m.person_id, { path: m.storage_path, primary: m.is_primary });
  }
  const outPeople: NetworkPerson[] = must(people, "osoby").map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.first_name,
    lastName: p.last_name,
    nickname: p.nickname,
    aliases: p.aliases,
    category: p.category,
    status: p.status,
    bio: p.bio,
    avatarUrl: avatarByPerson.has(p.id) ? mediaPublicUrl(avatarByPerson.get(p.id)!.path) : null,
  }));
  const outRels: NetworkRelationship[] = must(rels, "relacje").map((r) => ({
    id: r.id,
    slug: r.slug,
    personA: r.person_a,
    personB: r.person_b,
    type: r.type,
    strength: r.strength,
    since: r.since_year ?? (r.since_date ? Number(r.since_date.slice(0, 4)) : null),
    status: r.status,
  }));
  return { people: outPeople, relationships: outRels };
});

// -------------------------------------------------------------- dashboard ----
export async function getDashboard() {
  const db = await createSessionClient();
  const count = (table: "people" | "relationships" | "events" | "lore") =>
    db.from(table).select("id", { count: "exact", head: true }).neq("status", "archived");
  const [people, relationships, events, lore, recentPeople, recentRels, recentEvents, audit] = await Promise.all([
    count("people"),
    count("relationships"),
    count("events"),
    count("lore"),
    db.from("people").select("id, first_name, nickname, status, created_at").order("created_at", { ascending: false }).limit(5),
    db.from("relationships").select("id, person_a, person_b, type, status, created_at").order("created_at", { ascending: false }).limit(5),
    db.from("events").select("id, title, year, status, created_at").order("created_at", { ascending: false }).limit(5),
    db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    counts: {
      people: people.count ?? 0,
      relationships: relationships.count ?? 0,
      events: events.count ?? 0,
      lore: lore.count ?? 0,
    },
    recentPeople: must(recentPeople, "osoby"),
    recentRelationships: must(recentRels, "relacje"),
    recentEvents: must(recentEvents, "wydarzenia"),
    audit: must(audit, "historia zmian") as AuditLogRow[],
  };
}

// ----------------------------------------------------------------- people ----
export interface PersonListItem extends PersonRow {
  relationshipCount: number;
  eventCount: number;
  avatarUrl: string | null;
}

export async function listPeople(): Promise<PersonListItem[]> {
  const db = await createSessionClient();
  const [people, network, eventLinks] = await Promise.all([
    db.from("people").select("*").order("created_at", { ascending: false }),
    getNetwork(),
    db.from("event_people").select("person_id"),
  ]);
  const events = new Map<string, number>();
  for (const l of must(eventLinks, "uczestnicy")) events.set(l.person_id, (events.get(l.person_id) ?? 0) + 1);
  const degree = new Map<string, number>();
  for (const r of network.relationships) {
    degree.set(r.personA, (degree.get(r.personA) ?? 0) + 1);
    degree.set(r.personB, (degree.get(r.personB) ?? 0) + 1);
  }
  const avatars = new Map(network.people.map((p) => [p.id, p.avatarUrl]));
  return must(people, "osoby").map((p) => ({
    ...p,
    relationshipCount: degree.get(p.id) ?? 0,
    eventCount: events.get(p.id) ?? 0,
    avatarUrl: avatars.get(p.id) ?? null,
  }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Route params go into PostgREST filters: only accept real UUIDs. */
function assertUuid(id: string) {
  if (!UUID_RE.test(id)) notFound();
}

export async function getPersonDetail(id: string) {
  assertUuid(id);
  const db = await createSessionClient();
  const person = must(await db.from("people").select("*").eq("id", id).maybeSingle(), "osoba");
  if (!person) notFound();

  const [rels, eventLinks, loreLinks, media] = await Promise.all([
    db.from("relationships").select("*").or(`person_a.eq.${id},person_b.eq.${id}`),
    db.from("event_people").select("event_id").eq("person_id", id),
    db.from("lore_people").select("lore_id").eq("person_id", id),
    db.from("media").select("*").eq("person_id", id).order("created_at", { ascending: false }),
  ]);
  const eventIds = must(eventLinks, "wydarzenia").map((e) => e.event_id);
  const loreIds = must(loreLinks, "lore").map((l) => l.lore_id);
  const [events, lore] = await Promise.all([
    eventIds.length ? db.from("events").select("*").in("id", eventIds) : Promise.resolve({ data: [] as EventRow[], error: null }),
    loreIds.length ? db.from("lore").select("*").in("id", loreIds) : Promise.resolve({ data: [] as LoreRow[], error: null }),
  ]);
  return {
    person: person as PersonRow,
    relationships: must(rels, "relacje") as RelationshipRow[],
    events: must(events, "wydarzenia") as EventRow[],
    lore: must(lore, "lore") as LoreRow[],
    media: (must(media, "zdjęcia") as MediaRow[]).map(withUrl),
  };
}

// ---------------------------------------------------------- relationships ----
export async function listRelationships(): Promise<RelationshipRow[]> {
  const db = await createSessionClient();
  return must(await db.from("relationships").select("*").order("created_at", { ascending: false }), "relacje");
}

export async function getRelationshipDetail(id: string) {
  assertUuid(id);
  const db = await createSessionClient();
  const rel = must(await db.from("relationships").select("*").eq("id", id).maybeSingle(), "relacja");
  if (!rel) notFound();
  const links = must(await db.from("event_relationships").select("event_id").eq("relationship_id", id), "wydarzenia");
  const events = links.length
    ? must(await db.from("events").select("*").in("id", links.map((l) => l.event_id)), "wydarzenia")
    : [];
  return { relationship: rel as RelationshipRow, events: events as EventRow[] };
}

// ----------------------------------------------------------------- events ----
export interface EventListItem extends EventRow {
  people: string[];
  relationships: string[];
}

export async function listEvents(): Promise<EventListItem[]> {
  const db = await createSessionClient();
  const [events, ep, er] = await Promise.all([
    db.from("events").select("*").order("created_at", { ascending: false }),
    db.from("event_people").select("*"),
    db.from("event_relationships").select("*"),
  ]);
  const peopleBy = new Map<string, string[]>();
  for (const row of must(ep, "uczestnicy")) peopleBy.set(row.event_id, [...(peopleBy.get(row.event_id) ?? []), row.person_id]);
  const relsBy = new Map<string, string[]>();
  for (const row of must(er, "relacje wydarzeń")) relsBy.set(row.event_id, [...(relsBy.get(row.event_id) ?? []), row.relationship_id]);
  return must(events, "wydarzenia").map((e) => ({ ...e, people: peopleBy.get(e.id) ?? [], relationships: relsBy.get(e.id) ?? [] }));
}

export async function getEventDetail(id: string) {
  assertUuid(id);
  const db = await createSessionClient();
  const event = must(await db.from("events").select("*").eq("id", id).maybeSingle(), "wydarzenie");
  if (!event) notFound();
  const [ep, er, media] = await Promise.all([
    db.from("event_people").select("person_id").eq("event_id", id),
    db.from("event_relationships").select("relationship_id").eq("event_id", id),
    db.from("media").select("*").eq("event_id", id).order("created_at", { ascending: false }),
  ]);
  return {
    event: { ...(event as EventRow), people: must(ep, "uczestnicy").map((r) => r.person_id), relationships: must(er, "relacje").map((r) => r.relationship_id) },
    media: (must(media, "zdjęcia") as MediaRow[]).map(withUrl),
  };
}

// ------------------------------------------------------------------- lore ----
export interface LoreListItem extends LoreRow {
  people: string[];
}

export async function listLore(): Promise<LoreListItem[]> {
  const db = await createSessionClient();
  const [lore, lp] = await Promise.all([
    db.from("lore").select("*").order("created_at", { ascending: false }),
    db.from("lore_people").select("*"),
  ]);
  const peopleBy = new Map<string, string[]>();
  for (const row of must(lp, "osoby lore")) peopleBy.set(row.lore_id, [...(peopleBy.get(row.lore_id) ?? []), row.person_id]);
  return must(lore, "lore").map((l) => ({ ...l, people: peopleBy.get(l.id) ?? [] }));
}

export async function getLoreDetail(id: string) {
  assertUuid(id);
  const db = await createSessionClient();
  const lore = must(await db.from("lore").select("*").eq("id", id).maybeSingle(), "lore");
  if (!lore) notFound();
  const [lp, media] = await Promise.all([
    db.from("lore_people").select("person_id").eq("lore_id", id),
    db.from("media").select("*").eq("lore_id", id).order("created_at", { ascending: false }),
  ]);
  return {
    lore: { ...(lore as LoreRow), people: must(lp, "osoby").map((r) => r.person_id) },
    media: (must(media, "zdjęcia") as MediaRow[]).map(withUrl),
  };
}

// -------------------------------------------------------------- locations ----
export const listLocations = cache(async (): Promise<LocationRow[]> => {
  const db = await createSessionClient();
  return must(await db.from("locations").select("*").order("name"), "lokalizacje");
});

// ------------------------------------------------------------------ audit ----
export async function listAudit(limit = 200): Promise<AuditLogRow[]> {
  const db = await createSessionClient();
  return must(await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit), "historia zmian");
}

// ------------------------------------------------------------ search index ----
export interface SearchItem {
  kind: "person" | "relationship" | "event" | "lore";
  id: string;
  title: string;
  subtitle?: string;
  keywords: string;
  href: string;
}

export const getSearchIndex = cache(async (): Promise<SearchItem[]> => {
  const db = await createSessionClient();
  const [network, events, lore] = await Promise.all([
    getNetwork(),
    db.from("events").select("id, title, year, description"),
    db.from("lore").select("id, title, content"),
  ]);
  const names = new Map(network.people.map((p) => [p.id, p]));
  const label = (id: string) => {
    const p = names.get(id);
    return p ? (p.nickname && p.nickname !== p.name ? `${p.name} „${p.nickname}”` : p.name) : "?";
  };
  const items: SearchItem[] = [
    ...network.people.map((p) => ({
      kind: "person" as const,
      id: p.id,
      title: label(p.id),
      subtitle: p.slug,
      keywords: [p.name, p.lastName, p.nickname, p.slug, ...p.aliases, p.bio].filter(Boolean).join(" "),
      href: `/admin/people/${p.id}`,
    })),
    ...network.relationships.map((r) => ({
      kind: "relationship" as const,
      id: r.id,
      title: `${label(r.personA)} ↔ ${label(r.personB)}`,
      subtitle: r.type,
      keywords: `${label(r.personA)} ${label(r.personB)} ${r.type} ${r.slug}`,
      href: `/admin/relationships/${r.id}`,
    })),
    ...must(events, "wydarzenia").map((e) => ({
      kind: "event" as const,
      id: e.id,
      title: e.title,
      subtitle: e.year ? String(e.year) : undefined,
      keywords: `${e.title} ${e.year ?? ""} ${e.description ?? ""}`,
      href: `/admin/events/${e.id}`,
    })),
    ...must(lore, "lore").map((l) => ({
      kind: "lore" as const,
      id: l.id,
      title: l.title || l.content.slice(0, 60),
      keywords: `${l.title ?? ""} ${l.content}`,
      href: `/admin/lore/${l.id}`,
    })),
  ];
  return items;
});

// ------------------------------------------------------------------ export ----
export async function exportAll() {
  const db = await createSessionClient();
  const tables = [
    "locations",
    "people",
    "relationships",
    "events",
    "event_people",
    "event_relationships",
    "lore",
    "lore_people",
    "media",
  ] as const;
  const results = await Promise.all(tables.map((t) => db.from(t).select("*")));
  const out: Record<string, unknown> = { version: 1, exported_at: new Date().toISOString() };
  tables.forEach((t, i) => {
    out[t] = must(results[i] as { data: unknown[] | null; error: { message: string } | null }, t);
  });
  return out;
}

// ------------------------------------------------------------ submissions ----
/** A submission waiting for review = a draft that came from the public form. */
export interface PendingPerson {
  id: string;
  slug: string;
  first_name: string;
  nickname: string | null;
  bio: string;
  category: PersonRow["category"];
  submitted_at: string;
  submitted_by: string | null;
  /** Pending relationships submitted together with this person. */
  relationships: PendingRelationship[];
}

export interface PendingRelationship {
  id: string;
  type: RelationshipRow["type"];
  description: string;
  since_year: number | null;
  submitted_at: string;
  submitted_by: string | null;
  personA: { id: string; name: string; status: PersonRow["status"] };
  personB: { id: string; name: string; status: PersonRow["status"] };
}

export async function listSubmissions(): Promise<{ people: PendingPerson[]; relationships: PendingRelationship[] }> {
  const db = await createSessionClient();
  const [people, rels] = await Promise.all([
    db
      .from("people")
      .select("id, slug, first_name, nickname, bio, category, submitted_at, submitted_by")
      .eq("status", "draft")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
    db
      .from("relationships")
      .select("id, person_a, person_b, type, description, since_year, submitted_at, submitted_by")
      .eq("status", "draft")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
  ]);
  const pendingPeople = must(people, "zgłoszone osoby");
  const pendingRels = must(rels, "zgłoszone relacje");

  const ids = [...new Set(pendingRels.flatMap((r) => [r.person_a, r.person_b]))];
  const ends = ids.length
    ? must(await db.from("people").select("id, first_name, nickname, status").in("id", ids), "osoby w relacjach")
    : [];
  const end = new Map(
    ends.map((p) => [p.id, { id: p.id, name: p.nickname && p.nickname !== p.first_name ? `${p.first_name} „${p.nickname}”` : p.first_name, status: p.status }]),
  );
  const unknown = (id: string) => ({ id, name: "?", status: "draft" as const });

  const relationships: PendingRelationship[] = pendingRels.map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    since_year: r.since_year,
    submitted_at: r.submitted_at!,
    submitted_by: r.submitted_by,
    personA: end.get(r.person_a) ?? unknown(r.person_a),
    personB: end.get(r.person_b) ?? unknown(r.person_b),
  }));

  // A relationship that involves a pending person is reviewed together with that person.
  const pendingIds = new Set(pendingPeople.map((p) => p.id));
  const byPerson = new Map<string, PendingRelationship[]>();
  const standalone: PendingRelationship[] = [];
  for (const r of relationships) {
    const owner = pendingIds.has(r.personB.id) ? r.personB.id : pendingIds.has(r.personA.id) ? r.personA.id : null;
    if (owner) byPerson.set(owner, [...(byPerson.get(owner) ?? []), r]);
    else standalone.push(r);
  }

  return {
    people: pendingPeople.map((p) => ({ ...p, submitted_at: p.submitted_at!, relationships: byPerson.get(p.id) ?? [] })),
    relationships: standalone,
  };
}

export const countSubmissions = cache(async (): Promise<number> => {
  const db = await createSessionClient();
  const pending = (table: "people" | "relationships" | "lore" | "events") =>
    db.from(table).select("id", { count: "exact", head: true }).eq("status", "draft").not("submitted_at", "is", null);
  const [people, rels, lore, events, requests] = await Promise.all([
    pending("people"),
    pending("relationships"),
    pending("lore"),
    pending("events"),
    db.from("change_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  return (people.count ?? 0) + (rels.count ?? 0) + (lore.count ?? 0) + (events.count ?? 0) + (requests.count ?? 0);
});

/** Open change requests (oldest first: first come, first served) + the latest closed ones. */
export async function listChangeRequests(): Promise<{ open: ChangeRequestRow[]; closed: ChangeRequestRow[] }> {
  const db = await createSessionClient();
  const [open, closed] = await Promise.all([
    db.from("change_requests").select("*").eq("status", "open").order("created_at", { ascending: true }),
    db.from("change_requests").select("*").neq("status", "open").order("resolved_at", { ascending: false }).limit(20),
  ]);
  return { open: must(open, "prośby o zmianę"), closed: must(closed, "załatwione prośby") };
}

/** Lore and events submitted by visitors, with the names of the people they mention. */
export interface PendingStory {
  id: string;
  kind: "lore" | "event";
  title: string | null;
  text: string | null;
  loreType: LoreRow["lore_type"] | null;
  year: number | null;
  submitted_at: string;
  submitted_by: string | null;
  people: string[];
}

export async function listSubmittedStories(): Promise<PendingStory[]> {
  const db = await createSessionClient();
  const [lore, events, lorePeople, eventPeople] = await Promise.all([
    db.from("lore").select("*").eq("status", "draft").not("submitted_at", "is", null).order("submitted_at", { ascending: false }),
    db.from("events").select("*").eq("status", "draft").not("submitted_at", "is", null).order("submitted_at", { ascending: false }),
    db.from("lore_people").select("*"),
    db.from("event_people").select("*"),
  ]);
  // Before the lore/events submissions migration the columns don't exist: show nothing instead of failing.
  if (lore.error || events.error) {
    console.error("[admin query] zgłoszone lore/wydarzenia:", (lore.error ?? events.error)?.message);
    return [];
  }
  const names = new Map((await getNetwork()).people.map((p) => [p.id, p.nickname && p.nickname !== p.name ? `${p.name} „${p.nickname}”` : p.name]));
  const group = (links: { owner: string; person_id: string }[]) => {
    const out = new Map<string, string[]>();
    for (const l of links) out.set(l.owner, [...(out.get(l.owner) ?? []), names.get(l.person_id) ?? "?"]);
    return out;
  };
  const loreNames = group((lorePeople.data ?? []).map((l) => ({ owner: l.lore_id, person_id: l.person_id })));
  const eventNames = group((eventPeople.data ?? []).map((l) => ({ owner: l.event_id, person_id: l.person_id })));

  const stories: PendingStory[] = [
    ...(lore.data ?? []).map((l) => ({
      id: l.id,
      kind: "lore" as const,
      title: l.title,
      text: l.content,
      loreType: l.lore_type,
      year: l.year,
      submitted_at: l.submitted_at!,
      submitted_by: l.submitted_by,
      people: loreNames.get(l.id) ?? [],
    })),
    ...(events.data ?? []).map((e) => ({
      id: e.id,
      kind: "event" as const,
      title: e.title,
      text: e.description,
      loreType: null,
      year: e.year,
      submitted_at: e.submitted_at!,
      submitted_by: e.submitted_by,
      people: eventNames.get(e.id) ?? [],
    })),
  ];
  return stories.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
}
