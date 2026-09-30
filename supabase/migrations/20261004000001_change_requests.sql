-- =============================================================================
-- Change requests: anyone (no account) can ask for a correction to a person
-- or a relationship on the map, or ask for a person to be removed.
--
-- Unlike submissions, a request never touches the map data: it is only a
-- message for the admins, stored in its own table. anon cannot read or write
-- the table; the only entry point is submit_change_request() below.
-- =============================================================================

create table public.change_requests (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('correction', 'removal')),
  -- Kept (set null) when the target is deleted, so the request stays readable.
  person_id       uuid references public.people (id) on delete set null,
  relationship_id uuid references public.relationships (id) on delete set null,
  -- Snapshot of what the request was about, e.g. "Marek „Szef”".
  target_label    text not null,
  message         text not null check (length(message) between 1 and 1000),
  contact         text check (length(contact) <= 200),
  submitted_by    text check (length(submitted_by) <= 80),
  status          text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint change_requests_single_target check (num_nonnulls(person_id, relationship_id) <= 1),
  constraint change_requests_removal_person check (kind <> 'removal' or relationship_id is null)
);
create index change_requests_open_idx on public.change_requests (created_at desc) where status = 'open';

alter table public.change_requests enable row level security;
create policy "change_requests: admin full access" on public.change_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.change_requests from anon;
grant select, insert, update, delete on public.change_requests to authenticated;

-- Keeps resolved_at in sync with status.
create or replace function public.change_requests_status_ts()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'open' then null else now() end;
  end if;
  return new;
end;
$$;
create trigger change_requests_status_ts before update on public.change_requests
  for each row execute function public.change_requests_status_ts();

-- ------------------------------------------------------------------ RPC ----
-- `person` / `relationship` are public slugs (what the map uses as ids).
create or replace function public.submit_change_request(
  kind text,
  message text default null,
  person text default null,
  relationship text default null,
  contact text default null,
  submitted_by text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text := public.submission_text(message, 1000, 'message');
  v_contact text := public.submission_text(contact, 200, 'contact');
  v_author text := public.submission_text(submitted_by, 80, 'submitted_by');
  v_person uuid;
  v_rel uuid;
  v_label text;
begin
  if kind is null or kind not in ('correction', 'removal') then
    raise exception 'submission_missing:kind' using errcode = 'P0001';
  end if;
  if (person is null) = (relationship is null) then
    raise exception 'submission_missing:target' using errcode = 'P0001';
  end if;
  if kind = 'removal' and person is null then
    raise exception 'submission_missing:target' using errcode = 'P0001';
  end if;
  if kind = 'correction' and v_message is null then
    raise exception 'submission_missing:message' using errcode = 'P0001';
  end if;

  -- Same flood protection idea as submissions, counted separately.
  if (select count(*) from public.change_requests where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'submission_rate_limit' using errcode = 'P0001';
  end if;
  if (select count(*) from public.change_requests where status = 'open') >= 200 then
    raise exception 'submission_queue_full' using errcode = 'P0001';
  end if;

  if person is not null then
    select p.id,
           case when coalesce(p.nickname, '') not in ('', p.first_name)
             then p.first_name || ' „' || p.nickname || '”' else p.first_name end
      into v_person, v_label
      from public.people p where p.slug = person and p.status = 'published';
  else
    select r.id, pa.first_name || ' ↔ ' || pb.first_name
      into v_rel, v_label
      from public.relationships r
      join public.people pa on pa.id = r.person_a
      join public.people pb on pb.id = r.person_b
      where r.slug = relationship and r.status = 'published';
  end if;
  if v_label is null then
    raise exception 'submission_person_not_found' using errcode = 'P0001';
  end if;

  insert into public.change_requests (kind, person_id, relationship_id, target_label, message, contact, submitted_by)
  values (kind, v_person, v_rel, v_label, coalesce(v_message, 'Proszę o usunięcie mnie z mapy.'), v_contact, v_author);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_change_request(text, text, text, text, text, text) from public;
grant execute on function public.submit_change_request(text, text, text, text, text, text) to anon, authenticated;
