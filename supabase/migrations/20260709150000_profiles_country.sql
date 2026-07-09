-- Slice C (founder feedback): where a member is BASED. The Connect directory
-- filters on this (replacing the jurisdiction-of-interest filter there);
-- free-text `location` stays for display ("London, UK").
--
-- RLS is unchanged; profiles use column-level GRANTs (20260621120000), so the
-- new column must be added to both grant lists to be readable and editable.

alter table public.profiles
  add column country text;

alter table public.profiles
  add constraint profiles_country_length
    check (country is null or char_length(country) between 1 and 80);

grant select (country) on public.profiles to anon, authenticated;
grant update (country) on public.profiles to authenticated;

-- The Connect filter matches with eq on the curated vocabulary in
-- lib/profile.ts; a plain btree index covers it.
create index profiles_country_idx on public.profiles (country);
