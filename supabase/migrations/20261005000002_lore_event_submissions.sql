-- =============================================================================
-- Public submissions of lore and events (same model as people/relationships):
-- stored as DRAFTS marked `submitted_at`, visible only after approval.
-- =============================================================================

alter table public.lore
  add column submitted_at timestamptz,
  add column submitted_by text check (length(submitted_by) <= 80);

alter table public.events
  add column submitted_at timestamptz,
  add column submitted_by text check (length(submitted_by) <= 80);

create index lore_pending_idx on public.lore (submitted_at desc)
  where status = 'draft' and submitted_at is not null;
create index events_pending_idx on public.events (submitted_at desc)
  where status = 'draft' and submitted_at is not null;

-- The flood caps now cover all four kinds of submissions.
create or replace function public.check_submission_quota()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
  waiting int;
begin
  select (select count(*) from public.people where submitted_at > now() - interval '1 hour')
       + (select count(*) from public.relationships where submitted_at > now() - interval '1 hour')
       + (select count(*) from public.lore where submitted_at > now() - interval '1 hour')
       + (select count(*) from public.events where submitted_at > now() - interval '1 hour')
    into recent;
  if recent >= 30 then
    raise exception 'submission_rate_limit' using errcode = 'P0001';
  end if;
  select (select count(*) from public.people where status = 'draft' and submitted_at is not null)
       + (select count(*) from public.relationships where status = 'draft' and submitted_at is not null)
       + (select count(*) from public.lore where status = 'draft' and submitted_at is not null)
       + (select count(*) from public.events where status = 'draft' and submitted_at is not null)
    into waiting;
  if waiting >= 200 then
    raise exception 'submission_queue_full' using errcode = 'P0001';
  end if;
end;
$$;

-- Published people by slug; raises if any slug is unknown or not public.
create or replace function public.submission_people(slugs text[])
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wanted text[] := array(select distinct s from unnest(coalesce(slugs, '{}')) s where s is not null and s <> '');
  ids uuid[];
begin
  if cardinality(wanted) > 20 then
    raise exception 'submission_too_long:people' using errcode = 'P0001';
  end if;
  ids := array(select p.id from public.people p where p.slug = any (wanted) and p.status = 'published');
  if cardinality(ids) <> cardinality(wanted) then
    raise exception 'submission_person_not_found' using errcode = 'P0001';
  end if;
  return ids;
end;
$$;

-- ------------------------------------------------------------------ RPC ----
create or replace function public.submit_lore(
  content text,
  title text default null,
  lore_type public.lore_type default 'ciekawostka',
  year int default null,
  person_slugs text[] default '{}',
  submitted_by text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content text := public.submission_text(content, 2000, 'content');
  v_title text := public.submission_text(title, 160, 'title');
  v_author text := public.submission_text(submitted_by, 80, 'submitted_by');
  v_people uuid[];
  v_id uuid;
begin
  if v_content is null then
    raise exception 'submission_missing:content' using errcode = 'P0001';
  end if;
  if year is not null and (year < 1900 or year > extract(year from now())::int) then
    raise exception 'submission_invalid_year' using errcode = 'P0001';
  end if;
  perform public.check_submission_quota();
  v_people := public.submission_people(person_slugs);

  insert into public.lore (title, content, lore_type, year, confidence, source_type, status, submitted_at, submitted_by)
  values (v_title, v_content, coalesce(lore_type, 'ciekawostka'), year, 'lore', 'submitted', 'draft', now(), v_author)
  returning id into v_id;
  insert into public.lore_people (lore_id, person_id) select v_id, unnest(v_people);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.submit_event(
  title text,
  description text default null,
  year int default null,
  person_slugs text[] default '{}',
  submitted_by text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := public.submission_text(title, 200, 'title');
  v_descr text := public.submission_text(description, 2000, 'description');
  v_author text := public.submission_text(submitted_by, 80, 'submitted_by');
  v_people uuid[];
  v_id uuid;
begin
  if v_title is null then
    raise exception 'submission_missing:title' using errcode = 'P0001';
  end if;
  if year is not null and (year < 1900 or year > extract(year from now())::int) then
    raise exception 'submission_invalid_year' using errcode = 'P0001';
  end if;
  perform public.check_submission_quota();
  v_people := public.submission_people(person_slugs);

  insert into public.events (title, description, year, confidence, source_type, status, submitted_at, submitted_by)
  values (v_title, v_descr, year, 'probable', 'submitted', 'draft', now(), v_author)
  returning id into v_id;
  insert into public.event_people (event_id, person_id) select v_id, unnest(v_people);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submission_people(text[]) from public, anon, authenticated;
revoke all on function public.submit_lore(text, text, public.lore_type, int, text[], text) from public;
revoke all on function public.submit_event(text, text, int, text[], text) from public;
grant execute on function public.submit_lore(text, text, public.lore_type, int, text[], text) to anon, authenticated;
grant execute on function public.submit_event(text, text, int, text[], text) to anon, authenticated;
