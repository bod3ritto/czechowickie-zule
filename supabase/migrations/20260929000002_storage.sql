-- Media bucket: public read (files are served by URL), writes only for admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media bucket: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());

create policy "media bucket: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());

create policy "media bucket: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

create policy "media bucket: admin read" on storage.objects
  for select to authenticated using (bucket_id = 'media' and public.is_admin());
