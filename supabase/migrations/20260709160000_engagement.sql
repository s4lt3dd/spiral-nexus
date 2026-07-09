-- Slice D (founder feedback): engagement signals.
--
--   * listing_likes — public social "like" on a listing (distinct from the
--     private save/bookmark). Likes drive desirability signals and the
--     notifications panel ("X liked your listing").
--   * saved-count exposure — saves stay PRIVATE rows (who saved what is
--     nobody's business), but the AGGREGATE count per listing is public
--     product data ("show the number of Saves"). A SECURITY DEFINER function
--     exposes counts only — never the savers.

-- ---------------------------------------------------------------------------
-- 1. listing_likes
-- ---------------------------------------------------------------------------
create table public.listing_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.ip_assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Who liked what, newest first (activity feed) + per-listing lookups (counts,
-- notifications).
create index listing_likes_user_created_idx
  on public.listing_likes (user_id, created_at desc);
create index listing_likes_listing_created_idx
  on public.listing_likes (listing_id, created_at desc);

alter table public.listing_likes enable row level security;

-- Likes are a PUBLIC social signal inside the members' area: any signed-in
-- member may read them (counts on cards, "recent activity", and owners seeing
-- who liked their listings). Writes are strictly own-row.
create policy "members read likes"
  on public.listing_likes for select
  to authenticated
  using (true);

create policy "users like as themselves"
  on public.listing_likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users remove their own likes"
  on public.listing_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Saved counts (aggregate-only exposure of the private saved_listings)
-- ---------------------------------------------------------------------------
-- saved_listings RLS lets users see only their OWN saves; that stays. This
-- function runs as its owner (bypassing RLS) but returns ONLY (listing_id,
-- count) pairs for the ids requested — individual savers are never exposed.
create or replace function public.saved_counts(listing_ids uuid[])
returns table (listing_id uuid, saves bigint)
language sql
security definer
set search_path = public
stable
as $$
  select s.listing_id, count(*)::bigint as saves
  from public.saved_listings s
  where s.listing_id = any(listing_ids)
  group by s.listing_id
$$;

-- Signed-in members only (the browse surface is sign-in-only).
revoke execute on function public.saved_counts(uuid[]) from public, anon;
grant execute on function public.saved_counts(uuid[]) to authenticated;
