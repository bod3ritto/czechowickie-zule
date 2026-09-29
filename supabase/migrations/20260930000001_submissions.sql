-- =============================================================================
-- Public submissions: anyone (no account) can propose a person or a
-- relationship. A submission is an ordinary DRAFT row marked with
-- `submitted_at`, so the public never sees it (RLS: published only) until an
-- admin approves (publishes) it in the panel, or rejects (deletes) it.
--
-- anon still has no direct write access to any table. It can only call the
-- two SECURITY DEFINER functions below, which accept a small set of fields,
-- validate them, force status = 'draft', and cap the submission volume.
-- =============================================================================

alter table public.people
  add column submitted_at timestamptz,
  add column submitted_by text check (length(submitted_by) <= 80);

alter table public.relationships
  add column submitted_at timestamptz,
  add column submitted_by text check (length(submitted_by) <= 80);

create index people_pending_idx on public.people (submitted_at desc)
  where status = 'draft' and submitted_at is not null;
create index relationships_pending_idx on public.relationships (submitted_at desc)
  where status = 'draft' and submitted_at is not null;

-- ------------------------------------------------------------- helpers ----
-- "Łysy Mirek" → "lysy-mirek". Matches the slug check on people/relationships.
create or replace function public.slugify(txt text, fallback text default 'osoba')
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    nullif(trim(both '-' from left(regexp_replace(
      lower(translate(coalesce(txt, ''), 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ')),
      '[^a-z0-9]+', '-', 'g'), 60)), ''),
    fallback);
$$;

-- Trims, turns '' into null and enforces a maximum length.
create or replace function public.submission_text(val text, max_len int, field text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := nullif(btrim(coalesce(val, '')), '');
begin
  if v is not null and length(v) > max_len then
    raise exception 'submission_too_long:%', field using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Flood protection for an unauthenticated endpoint: a global hourly cap and a
-- cap on how many submissions may wait for review at once.
create or replace function public.check_submission_quota()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.people where submitted_at > now() - interval '1 hour')
     + (select count(*) from public.relationships where submitted_at > now() - interval '1 hour') >= 30 then
    raise exception 'submission_rate_limit' using errcode = 'P0001';
  end if;
  if (select count(*) from public.people where status = 'draft' and submitted_at is not null)
     + (select count(*) from public.relationships where status = 'draft' and submitted_at is not null) >= 200 then
    raise exception 'submission_queue_full' using errcode = 'P0001';
  end if;
end;
$$;

-- Inserts a draft relationship between two people (by id). Used by both RPCs.
create or replace function public.insert_submitted_relationship(
  a uuid, b uuid, rel_type public.relationship_type, descr text, since int, author text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  s text;
  n int := 1;
begin
  if a = b then
    raise exception 'submission_self_relationship' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.relationships
             where least(person_a, person_b) = least(a, b) and greatest(person_a, person_b) = greatest(a, b)) then
    raise exception 'submission_relationship_exists' using errcode = 'P0001';
  end if;
  if since is not null and (since < 1900 or since > extract(year from now())::int) then
    raise exception 'submission_invalid_year' using errcode = 'P0001';
  end if;

  base := (select slug from public.people where id = a) || '-' || (select slug from public.people where id = b);
  s := base;
  while exists (select 1 from public.relationships where slug = s) loop
    n := n + 1;
    s := base || '-' || n;
  end loop;

  insert into public.relationships
    (slug, person_a, person_b, type, description, since_year, confidence, source_type, status, submitted_at, submitted_by)
  values
    (s, a, b, rel_type, coalesce(descr, ''), since, 'probable', 'submitted', 'draft', now(), author);
end;
$$;

-- ------------------------------------------------------------------ RPC ----
-- Propose a new person, optionally already linked to someone on the map.
create or replace function public.submit_person(
  first_name text,
  nickname text default null,
  bio text default null,
  category public.person_category default 'bywalec',
  related_to text default null,
  related_type public.relationship_type default null,
  related_description text default null,
  submitted_by text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := public.submission_text(first_name, 80, 'first_name');
  v_nick text := public.submission_text(nickname, 80, 'nickname');
  v_bio text := public.submission_text(bio, 1000, 'bio');
  v_rel_descr text := public.submission_text(related_description, 500, 'related_description');
  v_author text := public.submission_text(submitted_by, 80, 'submitted_by');
  v_related uuid;
  v_id uuid;
  base text;
  s text;
  n int := 1;
begin
  if v_first is null then
    raise exception 'submission_missing:first_name' using errcode = 'P0001';
  end if;
  perform public.check_submission_quota();

  if related_to is not null then
    select id into v_related from public.people where slug = related_to and status = 'published';
    if v_related is null then
      raise exception 'submission_person_not_found' using errcode = 'P0001';
    end if;
    if related_type is null then
      raise exception 'submission_missing:related_type' using errcode = 'P0001';
    end if;
  end if;

  base := public.slugify(case when v_nick is not null and lower(v_nick) <> lower(v_first) then v_first || ' ' || v_nick else v_first end);
  s := base;
  while exists (select 1 from public.people where slug = s) loop
    n := n + 1;
    s := base || '-' || n;
  end loop;

  insert into public.people (slug, first_name, nickname, bio, category, status, submitted_at, submitted_by)
  values (s, v_first, v_nick, coalesce(v_bio, ''), coalesce(category, 'bywalec'), 'draft', now(), v_author)
  returning id into v_id;

  if v_related is not null then
    perform public.insert_submitted_relationship(v_related, v_id, related_type, v_rel_descr, null, v_author);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Propose a relationship between two people already on the map (by slug).
create or replace function public.submit_relationship(
  person_a text,
  person_b text,
  type public.relationship_type,
  description text default null,
  since_year int default null,
  submitted_by text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descr text := public.submission_text(description, 500, 'description');
  v_author text := public.submission_text(submitted_by, 80, 'submitted_by');
  v_a uuid;
  v_b uuid;
begin
  if type is null then
    raise exception 'submission_missing:type' using errcode = 'P0001';
  end if;
  perform public.check_submission_quota();

  select id into v_a from public.people where slug = person_a and status = 'published';
  select id into v_b from public.people where slug = person_b and status = 'published';
  if v_a is null or v_b is null then
    raise exception 'submission_person_not_found' using errcode = 'P0001';
  end if;

  perform public.insert_submitted_relationship(v_a, v_b, type, v_descr, since_year, v_author);
  return jsonb_build_object('ok', true);
end;
$$;

-- --------------------------------------------------------------- grants ----
-- Functions are executable by PUBLIC by default; only the two entry points
-- are meant for API callers.
revoke all on function public.slugify(text, text) from public, anon, authenticated;
revoke all on function public.submission_text(text, int, text) from public, anon, authenticated;
revoke all on function public.check_submission_quota() from public, anon, authenticated;
revoke all on function public.insert_submitted_relationship(uuid, uuid, public.relationship_type, text, int, text)
  from public, anon, authenticated;

revoke all on function public.submit_person(text, text, text, public.person_category, text, public.relationship_type, text, text)
  from public;
revoke all on function public.submit_relationship(text, text, public.relationship_type, text, int, text) from public;
grant execute on function public.submit_person(text, text, text, public.person_category, text, public.relationship_type, text, text)
  to anon, authenticated;
grant execute on function public.submit_relationship(text, text, public.relationship_type, text, int, text)
  to anon, authenticated;
