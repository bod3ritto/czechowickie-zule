-- =============================================================================
-- Moderators: a second role in the panel. A moderator can add, edit, publish
-- and approve submissions, but can never delete content (people,
-- relationships, events, lore, locations, photos), run an import, or handle
-- requests to be removed from the map. Enforced here by RLS, not only in the UI.
--
--   public.is_staff()  → any row in admin_users (admin or moderator)
--   public.is_admin()  → role = 'admin' only (redefined; it used to mean "any row")
--
-- Add a moderator (SQL Editor, after creating the user in Authentication):
--   insert into public.admin_users (user_id, email, role)
--   select id, email, 'moderator' from auth.users where email = 'kto@example.com';
-- =============================================================================

alter table public.admin_users
  add column role text not null default 'admin' check (role in ('admin', 'moderator'));

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'admin');
$$;

grant execute on function public.is_staff() to anon, authenticated;

-- ------------------------------------------------------------ policies ----
-- Content tables: staff read/insert/update, only admins delete.
-- Link tables (who took part in an event, who a lore entry is about) are part
-- of editing an entry, so staff may also delete those rows.
do $$
declare t text;
begin
  foreach t in array array['locations', 'people', 'relationships', 'events', 'lore', 'media',
                           'event_people', 'event_relationships', 'lore_people'] loop
    execute format('drop policy if exists "%s: admin full access" on public.%I', t, t);
    execute format('create policy "%s: staff read" on public.%I for select to authenticated using (public.is_staff())', t, t);
    execute format('create policy "%s: staff insert" on public.%I for insert to authenticated with check (public.is_staff())', t, t);
    execute format('create policy "%s: staff update" on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;

  foreach t in array array['locations', 'people', 'relationships', 'events', 'lore', 'media'] loop
    execute format('create policy "%s: admin delete" on public.%I for delete to authenticated using (public.is_admin())', t, t);
  end loop;

  foreach t in array array['event_people', 'event_relationships', 'lore_people'] loop
    execute format('create policy "%s: staff delete" on public.%I for delete to authenticated using (public.is_staff())', t, t);
  end loop;
end;
$$;

-- Change requests: moderators handle corrections; removals stay with admins.
drop policy if exists "change_requests: admin full access" on public.change_requests;
create policy "change_requests: staff read" on public.change_requests
  for select to authenticated using (public.is_staff());
create policy "change_requests: update" on public.change_requests
  for update to authenticated
  using (public.is_admin() or (public.is_staff() and kind = 'correction'))
  with check (public.is_admin() or (public.is_staff() and kind = 'correction'));
create policy "change_requests: admin delete" on public.change_requests
  for delete to authenticated using (public.is_admin());

drop policy if exists "audit_logs: admin read" on public.audit_logs;
create policy "audit_logs: staff read" on public.audit_logs
  for select to authenticated using (public.is_staff());

-- Draft preview on the public site works for the whole team.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.public_dataset(boolean)'::regprocedure);
  execute replace(def, 'public.is_admin()', 'public.is_staff()');
end;
$$;

-- Photos (Supabase Storage). Skipped where the storage schema doesn't exist (tests).
do $$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;
  drop policy if exists "media bucket: admin insert" on storage.objects;
  drop policy if exists "media bucket: admin update" on storage.objects;
  drop policy if exists "media bucket: admin read" on storage.objects;
  create policy "media bucket: staff insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
  create policy "media bucket: staff update" on storage.objects
    for update to authenticated using (bucket_id = 'media' and public.is_staff());
  create policy "media bucket: staff read" on storage.objects
    for select to authenticated using (bucket_id = 'media' and public.is_staff());
  -- "media bucket: admin delete" stays as it is (is_admin() now means admins only).
end;
$$;
