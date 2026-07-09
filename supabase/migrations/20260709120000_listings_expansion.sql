-- Slice B (founder feedback): expand trademark listings with the full data
-- set a serious IP deal needs, plus Storage for certificates and images.
--
--   * office_url          — link to the mark's record at the registration office
--   * currency            — ISO-4217 code for asking_price (was hardcoded GBP)
--   * territory           — countries where the trademark rights apply
--   * filing_date         — when the mark was filed
--   * license_duration    — how long the owner will license for (free text)
--   * license_renewable   — open to renewing the license (null = unspecified)
--   * encumbrances        — encumbrances / restrictions (optional free text)
--   * quality_control     — quality + control terms (optional free text)
--   * certificate_path    — Storage path of the registration certificate
--   * nice_classes        — MULTIPLE Nice classes (replaces single nice_class)

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
alter table public.ip_assets
  add column office_url text,
  add column currency text not null default 'GBP',
  add column territory text[] not null default '{}',
  add column filing_date date,
  add column license_duration text,
  add column license_renewable boolean,
  add column encumbrances text,
  add column quality_control text,
  add column certificate_path text,
  add column nice_classes int[] not null default '{}';

-- Backfill the multi-class array from the legacy single class, then drop it
-- (dropping also removes ip_assets_nice_class_range from 0002 and the
-- ip_assets_nice_class_idx filter index from 20260614204057).
update public.ip_assets
  set nice_classes = array[nice_class]
  where nice_class is not null;

alter table public.ip_assets drop column nice_class;

-- ---------------------------------------------------------------------------
-- 2. Constraints (mirror the Zod boundary so bad rows can't sneak in via SQL)
-- ---------------------------------------------------------------------------
alter table public.ip_assets
  add constraint ip_assets_currency_iso
    check (currency ~ '^[A-Z]{3}$'),
  -- every element must be a valid Nice class (1–45); <@ against the literal
  -- 1..45 array is immutable, so it's CHECK-safe.
  add constraint ip_assets_nice_classes_range
    check (
      nice_classes <@ array[
        1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,
        24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45
      ]
    ),
  add constraint ip_assets_filing_date_sane
    check (filing_date is null or filing_date between date '1875-01-01' and now()::date),
  add constraint ip_assets_text_lengths
    check (
      coalesce(char_length(office_url), 0) <= 2000
      and coalesce(char_length(license_duration), 0) <= 200
      and coalesce(char_length(encumbrances), 0) <= 4000
      and coalesce(char_length(quality_control), 0) <= 4000
      and coalesce(char_length(certificate_path), 0) <= 500
      and coalesce(array_length(territory, 1), 0) <= 60
      and coalesce(array_length(nice_classes, 1), 0) <= 45
    );

-- Filter index for the browse "Nice class" filter (array containment).
create index ip_assets_nice_classes_idx
  on public.ip_assets using gin (nice_classes);

-- ---------------------------------------------------------------------------
-- 3. Storage buckets + RLS (same migration — a bucket without policies is a bug)
-- ---------------------------------------------------------------------------
-- listing-images: public bucket (cards/detail render plain URLs).
-- listing-docs:   PRIVATE bucket for registration certificates; served to
--                 signed-in members via short-lived signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880,
   array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']),
  ('listing-docs', 'listing-docs', false, 10485760,
   array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Uploads are namespaced per owner: <auth.uid()>/<uuid>.<ext>. The first
-- folder segment must be the uploader's own id — nobody can write into (or
-- delete from) another member's folder.

-- listing-images ------------------------------------------------------------
create policy "listing images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "owners upload listing images to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners delete their listing images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- listing-docs ----------------------------------------------------------------
-- Private bucket: no anonymous access. Signed-in members may read (the
-- certificate exists to be shown to potential buyers, and browse is already
-- sign-in-only); the detail page serves it via a short-lived signed URL,
-- which requires the caller to pass this SELECT policy. Paths contain a
-- random UUID, so draft certificates aren't enumerable.
create policy "members read listing docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'listing-docs');

create policy "owners upload listing docs to their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners delete their listing docs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
