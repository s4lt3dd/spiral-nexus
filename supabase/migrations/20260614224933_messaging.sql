-- Slice 3: 1:1 messaging. A buyer contacts a listing's owner; both can reply.
-- RLS restricts every row to its two participants. Listing deletion keeps the
-- thread readable (ON DELETE SET NULL), per founder decision.

-- ---------- conversations ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Kept readable if the listing is later deleted (don't cascade-destroy threads).
  listing_id uuid references public.ip_assets (id) on delete set null,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_no_self check (buyer_id <> owner_id),
  -- One thread per buyer per listing (re-contacting reuses it).
  constraint conversations_unique_thread unique (listing_id, buyer_id)
);

alter table public.conversations enable row level security;

-- Only the two participants can see a conversation.
create policy "participants read conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = owner_id);

-- Only the buyer creates the thread, as themselves, and never with themselves.
create policy "buyer creates conversation"
  on public.conversations for insert
  with check (auth.uid() = buyer_id and buyer_id <> owner_id);

-- ---------- messages ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_len check (char_length(body) between 1 and 2000)
);

alter table public.messages enable row level security;

-- A participant of the parent conversation can read its messages.
create policy "participants read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- A participant can post, but only as themselves (no sender spoofing).
create policy "participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

-- Keep conversations.last_message_at fresh for inbox ordering. Runs as definer
-- so it can update the conversation row regardless of the sender's RLS.
create function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

create index conversations_buyer_idx on public.conversations (buyer_id);
create index conversations_owner_idx on public.conversations (owner_id);
create index conversations_listing_idx on public.conversations (listing_id);
create index conversations_last_msg_idx on public.conversations (last_message_at desc);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
