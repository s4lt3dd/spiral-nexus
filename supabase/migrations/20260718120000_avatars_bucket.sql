-- Avatars storage: a public bucket for profile photos, so members can upload a
-- photo instead of pasting a URL. Mirrors the listing-images bucket's model —
-- public read, own-folder write (RLS in the SAME migration, no exceptions).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Public read: avatars render as plain <img> URLs across the app.
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- A member may write only within their own {uid}/ folder — the same
-- ownership check the listing buckets use.
create policy "Members upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
