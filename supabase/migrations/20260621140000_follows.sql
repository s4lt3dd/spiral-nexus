-- Slice 8b: follows (member-to-member follow graph). New table, additive.
-- RLS in the same migration.

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- One edge per pair; makes follow idempotent + unfollow exact.
  primary key (follower_id, following_id),
  -- You cannot follow yourself (DB backstop; the action also guards).
  constraint no_self_follow check (follower_id <> following_id)
);

alter table public.follows enable row level security;

-- The graph is readable by any signed-in member (needed for follower/following
-- counts and the follow-button state). Pre-launch is invite-only, so no anon
-- read. You can only create/remove your OWN follow edges.
create policy "authenticated read follows"
  on public.follows for select using (auth.uid() is not null);

create policy "users follow as self"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "users unfollow as self"
  on public.follows for delete using (auth.uid() = follower_id);

create index follows_following_idx on public.follows (following_id); -- followers of X
create index follows_follower_idx  on public.follows (follower_id);  -- who X follows
