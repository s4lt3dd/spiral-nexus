-- Slice 8a: saved_listings (a user's private bookmarks of published listings).
-- New table, additive — no other slice touches it. RLS in the same migration.

create table public.saved_listings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.ip_assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- A listing can be saved once per user; makes save idempotent + unsave exact.
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

-- Saves are private: a user only ever reads/writes their own rows. No public
-- read policy — nobody can see who saved what.
create policy "users read own saves"
  on public.saved_listings for select using (auth.uid() = user_id);

create policy "users insert own saves"
  on public.saved_listings for insert with check (auth.uid() = user_id);

create policy "users delete own saves"
  on public.saved_listings for delete using (auth.uid() = user_id);

-- Fast "my saved listings, newest first".
create index saved_listings_user_idx
  on public.saved_listings (user_id, created_at desc);
