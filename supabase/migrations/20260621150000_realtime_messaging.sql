-- Slice 9: real-time messaging.
--
-- 1) Put `messages` on the supabase_realtime publication so clients can subscribe
--    to INSERTs via Postgres Changes. The existing "participants read messages"
--    SELECT policy IS the realtime authorization boundary: Realtime evaluates that
--    policy against each subscriber's JWT and delivers a row only if it passes, so
--    a non-participant subscribing to another thread receives nothing.
--    (At Launch scale, migrate to Broadcast-from-database — realtime.broadcast_changes()
--     + RLS on realtime.messages — for lower per-connection DB load. Not needed pre-launch.)
--
--    We only subscribe to INSERT (new messages are never edited or deleted), so the
--    default REPLICA IDENTITY is sufficient — the new-row tuple carries every column
--    the policy and UI need (incl. conversation_id). FULL is only required for old-row
--    data on UPDATE/DELETE, which messaging doesn't do.

alter publication supabase_realtime add table public.messages;

-- 2) Per-user read state for unread badges. One row per (conversation, user) holding
--    the moment that user last opened the thread; unread = messages after it from the
--    other party. Owner-only RLS: a user reads/writes ONLY their own row, and only for
--    a conversation they actually participate in.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

-- A user can see only their own read markers.
create policy "users read own read-state"
  on public.conversation_reads for select
  using (auth.uid() = user_id);

-- A user can create a read marker only for themselves, and only on a conversation
-- they participate in (no marking arbitrary conversations).
create policy "users create own read-state"
  on public.conversation_reads for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- A user can advance only their own read marker.
create policy "users update own read-state"
  on public.conversation_reads for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
    )
  );
