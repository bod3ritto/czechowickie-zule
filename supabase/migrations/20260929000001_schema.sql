-- =============================================================================
-- Czechowickie Żule — schema, RLS, triggers, RPC.
--
-- Security model
--   anon           → SELECT only on PUBLISHED rows (RLS) and only on public
--                    columns (column-level GRANTs). Never sees drafts, sources,
--                    admin notes, last names, birth dates, addresses.
--   authenticated  → full CRUD, but every policy requires public.is_admin(),
--                    i.e. a row in public.admin_users. Signing up is not enough.
--   audit_logs     → written only by SECURITY DEFINER triggers (not forgeable
--                    from the client), readable by admins.
-- =============================================================================

-- ---------------------------------------------------------------- enums ----
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.confidence_level as enum ('confirmed', 'probable', 'lore', 'rumor');
create type public.source_type as enum ('personal', 'submitted', 'public', 'unknown');
create type public.person_category as enum ('stala-ekipa', 'bywalec', 'legenda', 'z-daleka');
create type public.relationship_type as enum (
  'znajomi', 'rodzina', 'szkola', 'praca', 'osiedle', 'sasiedztwo', 'imprezy',
  'sport', 'akcje', 'biznes', 'z-widzenia', 'podobno', 'duet', 'inne'
);
create type public.relationship_tone as enum ('pozytywna', 'neutralna', 'zabawna', 'skomplikowana');
create type public.lore_type as enum ('historia', 'ciekawostka', 'cytat', 'legenda', 'inside-joke', 'plotka');
create type public.media_kind as enum ('avatar', 'event', 'lore', 'other');

-- --------------------------------------------------------------- tables ----
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  description text,
  address     text,
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.people (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  first_name   text not null check (length(btrim(first_name)) > 0),
  last_name    text,
  nickname     text,
  aliases      text[] not null default '{}',
  bio          text not null default '',
  legend       text,
  category     public.person_category not null default 'bywalec',
  tags         text[] not null default '{}',
  birth_date   date,
  first_seen   integer check (first_seen between 1900 and 2100),
  location_id  uuid references public.locations (id) on delete set null,
  admin_notes  text,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index people_status_idx on public.people (status);
create index people_created_at_idx on public.people (created_at desc);

create table public.relationships (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  person_a     uuid not null references public.people (id) on delete cascade,
  person_b     uuid not null references public.people (id) on delete cascade,
  type         public.relationship_type not null,
  strength     smallint not null default 50 check (strength between 0 and 100),
  since_year   integer check (since_year between 1900 and 2100),
  since_date   date,
  until_year   integer check (until_year between 1900 and 2100),
  until_date   date,
  description  text not null default '',
  tone         public.relationship_tone,
  confidence   public.confidence_level not null default 'confirmed',
  source_type  public.source_type not null default 'unknown',
  source_note  text,
  location_id  uuid references public.locations (id) on delete set null,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint relationships_not_self check (person_a <> person_b),
  constraint relationships_until_after_since check (until_year is null or since_year is null or until_year >= since_year)
);
-- Undirected: A–B and B–A are the same relationship.
create unique index relationships_pair_unique
  on public.relationships (least(person_a, person_b), greatest(person_a, person_b));
create index relationships_person_a_idx on public.relationships (person_a);
create index relationships_person_b_idx on public.relationships (person_b);
create index relationships_status_idx on public.relationships (status);
create index relationships_created_at_idx on public.relationships (created_at desc);

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(btrim(title)) > 0),
  description  text,
  event_date   date,
  year         integer check (year between 1900 and 2100),
  month        smallint check (month between 1 and 12),
  location_id  uuid references public.locations (id) on delete set null,
  confidence   public.confidence_level not null default 'confirmed',
  source_type  public.source_type not null default 'unknown',
  source_note  text,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index events_status_idx on public.events (status);
create index events_created_at_idx on public.events (created_at desc);
create index events_year_idx on public.events (year);

create table public.event_people (
  event_id  uuid not null references public.events (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (event_id, person_id)
);
create index event_people_person_idx on public.event_people (person_id);

create table public.event_relationships (
  event_id        uuid not null references public.events (id) on delete cascade,
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  primary key (event_id, relationship_id)
);
create index event_relationships_rel_idx on public.event_relationships (relationship_id);

create table public.lore (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  content      text not null check (length(btrim(content)) > 0),
  lore_type    public.lore_type not null default 'ciekawostka',
  year         integer check (year between 1900 and 2100),
  confidence   public.confidence_level not null default 'lore',
  source_type  public.source_type not null default 'unknown',
  source_note  text,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index lore_status_idx on public.lore (status);
create index lore_created_at_idx on public.lore (created_at desc);

create table public.lore_people (
  lore_id   uuid not null references public.lore (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (lore_id, person_id)
);
create index lore_people_person_idx on public.lore_people (person_id);

-- Files live in Supabase Storage (bucket "media"); this table only stores paths.
create table public.media (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  kind         public.media_kind not null,
  person_id    uuid references public.people (id) on delete cascade,
  event_id     uuid references public.events (id) on delete cascade,
  lore_id      uuid references public.lore (id) on delete cascade,
  alt          text,
  is_primary   boolean not null default false,
  mime_type    text,
  size_bytes   integer,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  constraint media_single_owner check (num_nonnulls(person_id, event_id, lore_id) <= 1)
);
create index media_person_idx on public.media (person_id);
create index media_event_idx on public.media (event_id);
create index media_lore_idx on public.media (lore_id);
create unique index media_primary_person on public.media (person_id) where is_primary and person_id is not null;
create unique index media_primary_event on public.media (event_id) where is_primary and event_id is not null;
create unique index media_primary_lore on public.media (lore_id) where is_primary and lore_id is not null;

create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  actor_email  text,
  action       text not null check (action in ('created', 'updated', 'deleted', 'published', 'unpublished', 'archived', 'imported')),
  entity_type  text not null,
  entity_id    uuid,
  entity_label text,
  details      jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ------------------------------------------------------------- helpers ----
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Keeps published_at / archived_at in sync with status changes.
create or replace function public.set_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'published' then new.published_at := coalesce(new.published_at, now()); end if;
    if new.status = 'archived' then new.archived_at := now(); else new.archived_at := null; end if;
  end if;
  return new;
end;
$$;

-- Generic audit trigger. Runs as definer so clients can't write logs directly.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec     jsonb := to_jsonb(coalesce(new, old));
  act     text;
  label   text;
  claims  jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if current_setting('app.skip_audit', true) = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then act := 'created';
  elsif tg_op = 'DELETE' then act := 'deleted';
  elsif (to_jsonb(new)->>'status') is distinct from (to_jsonb(old)->>'status') then
    -- Only tables with a status column can get here (others compare null to null).
    act := case
      when to_jsonb(new)->>'status' = 'published' then 'published'
      when to_jsonb(new)->>'status' = 'archived' then 'archived'
      when to_jsonb(old)->>'status' = 'published' then 'unpublished'
      else 'updated'
    end;
  else act := 'updated';
  end if;

  label := case tg_table_name
    when 'people' then
      case when coalesce(rec->>'nickname', '') not in ('', rec->>'first_name')
        then (rec->>'first_name') || ' „' || (rec->>'nickname') || '”'
        else rec->>'first_name' end
    when 'relationships' then
      coalesce((select first_name from public.people where id = (rec->>'person_a')::uuid), '?')
      || ' ↔ ' ||
      coalesce((select first_name from public.people where id = (rec->>'person_b')::uuid), '?')
    when 'events' then rec->>'title'
    when 'lore' then coalesce(nullif(rec->>'title', ''), left(rec->>'content', 60))
    when 'locations' then rec->>'name'
    else null
  end;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, entity_label)
  values (auth.uid(), claims->>'email', act, tg_table_name, (rec->>'id')::uuid, label);

  return coalesce(new, old);
end;
$$;

-- ------------------------------------------------------------- triggers ----
do $$
declare t text;
begin
  foreach t in array array['locations', 'people', 'relationships', 'events', 'lore'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
  end loop;
  foreach t in array array['people', 'relationships', 'events', 'lore'] loop
    execute format('create trigger %I_status_ts before insert or update on public.%I for each row execute function public.set_status_timestamps()', t, t);
  end loop;
end;
$$;

-- ------------------------------------------------------------------ RLS ----
alter table public.admin_users enable row level security;
alter table public.locations enable row level security;
alter table public.people enable row level security;
alter table public.relationships enable row level security;
alter table public.events enable row level security;
alter table public.event_people enable row level security;
alter table public.event_relationships enable row level security;
alter table public.lore enable row level security;
alter table public.lore_people enable row level security;
alter table public.media enable row level security;
alter table public.audit_logs enable row level security;

-- admin_users: a user may check their own membership; nobody edits it via the API.
create policy "admin_users: read own" on public.admin_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Admins: full CRUD everywhere.
do $$
declare t text;
begin
  foreach t in array array['locations', 'people', 'relationships', 'events', 'event_people',
                           'event_relationships', 'lore', 'lore_people', 'media'] loop
    execute format(
      'create policy "%s: admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t);
  end loop;
end;
$$;

create policy "audit_logs: admin read" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Public (anon): published only. Relationships/links also require their ends to be published.
create policy "people: public published" on public.people
  for select to anon using (status = 'published');

create policy "relationships: public published" on public.relationships
  for select to anon using (
    status = 'published'
    and exists (select 1 from public.people p where p.id = person_a and p.status = 'published')
    and exists (select 1 from public.people p where p.id = person_b and p.status = 'published')
  );

create policy "events: public published" on public.events
  for select to anon using (status = 'published');

create policy "event_people: public published" on public.event_people
  for select to anon using (
    exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
    and exists (select 1 from public.people p where p.id = person_id and p.status = 'published')
  );

create policy "event_relationships: public published" on public.event_relationships
  for select to anon using (
    exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
    and exists (select 1 from public.relationships r where r.id = relationship_id and r.status = 'published')
  );

create policy "lore: public published" on public.lore
  for select to anon using (status = 'published');

create policy "lore_people: public published" on public.lore_people
  for select to anon using (
    exists (select 1 from public.lore l where l.id = lore_id and l.status = 'published')
    and exists (select 1 from public.people p where p.id = person_id and p.status = 'published')
  );

create policy "locations: public read" on public.locations
  for select to anon using (true);

create policy "media: public published owner" on public.media
  for select to anon using (
    (person_id is not null and exists (select 1 from public.people p where p.id = person_id and p.status = 'published'))
    or (event_id is not null and exists (select 1 from public.events e where e.id = event_id and e.status = 'published'))
    or (lore_id is not null and exists (select 1 from public.lore l where l.id = lore_id and l.status = 'published'))
  );

-- --------------------------------------------------------------- grants ----
-- Supabase grants everything to anon by default; lock it down to public columns.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

grant select (id, slug, first_name, nickname, aliases, bio, legend, category, first_seen, status)
  on public.people to anon;
grant select (id, slug, person_a, person_b, type, strength, since_year, since_date, until_year, until_date,
              description, tone, confidence, location_id, status)
  on public.relationships to anon;
grant select (id, title, description, event_date, year, month, location_id, confidence, status)
  on public.events to anon;
grant select on public.event_people, public.event_relationships, public.lore_people to anon;
grant select (id, title, content, lore_type, year, confidence, status) on public.lore to anon;
grant select (id, name, lat, lng) on public.locations to anon;
grant select (id, storage_path, kind, person_id, event_id, lore_id, alt, is_primary, created_at)
  on public.media to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

-- ------------------------------------------------------------------ RPC ----
-- The whole public dataset in one round trip, already in the shape of
-- `types/domain.ts`. SECURITY INVOKER: RLS + column grants decide what the
-- caller sees. `include_drafts` only has an effect for admins (preview).
create or replace function public.public_dataset(include_drafts boolean default false)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with vis as (
    select case when include_drafts and public.is_admin()
      then array['published', 'draft']::public.content_status[]
      else array['published']::public.content_status[] end as statuses
  ),
  p as (
    select pe.id, pe.slug, pe.first_name, pe.nickname, pe.aliases, pe.bio, pe.legend, pe.category,
           pe.first_seen, pe.status
    from public.people pe, vis where pe.status = any (vis.statuses)
  ),
  avatar as (
    select distinct on (m.person_id) m.person_id, m.storage_path
    from public.media m
    where m.kind = 'avatar' and m.person_id in (select id from p)
    order by m.person_id, m.is_primary desc, m.created_at desc
  ),
  r as (
    select re.id, re.slug, pa.slug as a, pb.slug as b, re.type, re.strength,
           coalesce(re.since_year, extract(year from re.since_date)::int) as since,
           coalesce(re.until_year, extract(year from re.until_date)::int) as until,
           re.description, re.tone, re.confidence, re.status, re.location_id
    from public.relationships re
    join p pa on pa.id = re.person_a
    join p pb on pb.id = re.person_b, vis
    where re.status = any (vis.statuses)
  ),
  e as (
    select ev.id, ev.title, ev.description, ev.confidence, ev.location_id,
           coalesce(ev.year, extract(year from ev.event_date)::int) as year,
           coalesce(ev.month, extract(month from ev.event_date)::int) as month
    from public.events ev, vis where ev.status = any (vis.statuses)
  ),
  l as (
    select lo.id, lo.title, lo.content, lo.lore_type, lo.year, lo.confidence
    from public.lore lo, vis where lo.status = any (vis.statuses)
  )
  select jsonb_build_object(
    'people', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', p.slug, 'name', p.first_name, 'nickname', nullif(p.nickname, ''), 'aliases', p.aliases,
        'bio', p.bio, 'legend', nullif(p.legend, ''), 'category', p.category, 'firstSeen', p.first_seen,
        'status', p.status, 'avatarPath', avatar.storage_path
      )) order by p.first_name)
      from p left join avatar on avatar.person_id = p.id), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', r.slug, 'personA', r.a, 'personB', r.b, 'type', r.type, 'strength', r.strength,
        'since', r.since, 'until', r.until, 'description', r.description, 'tone', r.tone,
        'confidence', r.confidence, 'status', r.status,
        'location', case when loc.id is not null and loc.lat is not null
          then jsonb_build_object('name', loc.name, 'lat', loc.lat, 'lng', loc.lng) end
      )))
      from r left join public.locations loc on loc.id = r.location_id), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', e.id, 'title', e.title, 'description', nullif(e.description, ''), 'year', e.year, 'month', e.month,
        'confidence', e.confidence,
        'people', coalesce((select jsonb_agg(p.slug) from public.event_people ep join p on p.id = ep.person_id
                            where ep.event_id = e.id), '[]'::jsonb),
        'relationshipIds', coalesce((select jsonb_agg(r.slug) from public.event_relationships er join r on r.id = er.relationship_id
                                     where er.event_id = e.id), '[]'::jsonb),
        'location', case when loc.id is not null and loc.lat is not null
          then jsonb_build_object('name', loc.name, 'lat', loc.lat, 'lng', loc.lng) end
      )))
      from e left join public.locations loc on loc.id = e.location_id), '[]'::jsonb),
    'lore', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', l.id, 'title', nullif(l.title, ''), 'content', l.content, 'type', l.lore_type, 'year', l.year,
        'confidence', l.confidence,
        'people', coalesce((select jsonb_agg(p.slug) from public.lore_people lp join p on p.id = lp.person_id
                            where lp.lore_id = l.id), '[]'::jsonb)
      )))
      from l), '[]'::jsonb)
  );
$$;

-- Atomic JSON import (admins only). mode 'merge' keeps existing rows (by id
-- or slug) and adds new ones; mode 'replace' wipes content tables first.
-- SECURITY DEFINER so it can write the single "imported" audit entry; the
-- admin check below is therefore mandatory and comes first.
create or replace function public.admin_import(payload jsonb, mode text default 'merge')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  counts jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if mode not in ('merge', 'replace') then
    raise exception 'invalid mode %', mode;
  end if;

  perform set_config('app.skip_audit', 'on', true);

  if mode = 'replace' then
    delete from public.lore;
    delete from public.events;
    delete from public.relationships;
    delete from public.media;
    delete from public.people;
    delete from public.locations;
  end if;

  insert into public.locations select * from jsonb_populate_recordset(null::public.locations, coalesce(payload->'locations', '[]'))
    on conflict (id) do nothing;
  insert into public.people select * from jsonb_populate_recordset(null::public.people, coalesce(payload->'people', '[]'))
    on conflict do nothing;
  insert into public.relationships select * from jsonb_populate_recordset(null::public.relationships, coalesce(payload->'relationships', '[]'))
    on conflict do nothing;
  insert into public.events select * from jsonb_populate_recordset(null::public.events, coalesce(payload->'events', '[]'))
    on conflict (id) do nothing;
  insert into public.lore select * from jsonb_populate_recordset(null::public.lore, coalesce(payload->'lore', '[]'))
    on conflict (id) do nothing;
  insert into public.media select * from jsonb_populate_recordset(null::public.media, coalesce(payload->'media', '[]'))
    on conflict do nothing;
  insert into public.event_people
    select x.* from jsonb_populate_recordset(null::public.event_people, coalesce(payload->'event_people', '[]')) x
    where exists (select 1 from public.events where id = x.event_id) and exists (select 1 from public.people where id = x.person_id)
    on conflict do nothing;
  insert into public.event_relationships
    select x.* from jsonb_populate_recordset(null::public.event_relationships, coalesce(payload->'event_relationships', '[]')) x
    where exists (select 1 from public.events where id = x.event_id) and exists (select 1 from public.relationships where id = x.relationship_id)
    on conflict do nothing;
  insert into public.lore_people
    select x.* from jsonb_populate_recordset(null::public.lore_people, coalesce(payload->'lore_people', '[]')) x
    where exists (select 1 from public.lore where id = x.lore_id) and exists (select 1 from public.people where id = x.person_id)
    on conflict do nothing;

  counts := jsonb_build_object(
    'people', (select count(*) from public.people),
    'relationships', (select count(*) from public.relationships),
    'events', (select count(*) from public.events),
    'lore', (select count(*) from public.lore)
  );

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_label, details)
  values (auth.uid(), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email', 'imported', 'dataset',
          case mode when 'replace' then 'Import (zastąpienie)' else 'Import (scalenie)' end,
          jsonb_build_object('mode', mode, 'totals', counts));

  return counts;
end;
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.public_dataset(boolean) to anon, authenticated;
grant execute on function public.admin_import(jsonb, text) to authenticated;
