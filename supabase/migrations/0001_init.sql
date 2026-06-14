-- Spiral Nexus initial schema: profiles + ip_assets, with RLS.
-- A table without RLS is a security bug, so policies live in the same migration.

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  org_name text,
  role_flags text[] not null default '{buyer}',
  subscription_tier text not null default 'entry',
  verified boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles are publicly readable (needed to show listing owners).
create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ip_assets ----------
create type public.ip_type as enum ('trademark', 'patent');
create type public.deal_type as enum ('license', 'sale', 'both');
create type public.asset_source as enum ('user_submitted', 'ip_office');

create table public.ip_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type public.ip_type not null default 'trademark',
  title text not null,
  description text,
  jurisdiction text,
  registration_number text,
  status text,
  deal_type public.deal_type not null default 'license',
  asking_price numeric,
  source public.asset_source not null default 'user_submitted',
  -- trademark-specific
  nice_class int,
  mark_image_url text,
  -- patent-specific
  ipc_class text,
  abstract text,
  images text[],
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ip_assets enable row level security;

-- Anyone (including anonymous) may read published listings.
create policy "published listings are public"
  on public.ip_assets for select using (is_published = true);

-- Owners can read all of their own listings, including unpublished.
create policy "owners read own listings"
  on public.ip_assets for select using (auth.uid() = owner_id);

create policy "owners insert own listings"
  on public.ip_assets for insert with check (auth.uid() = owner_id);

create policy "owners update own listings"
  on public.ip_assets for update using (auth.uid() = owner_id);

create policy "owners delete own listings"
  on public.ip_assets for delete using (auth.uid() = owner_id);

-- keep updated_at fresh
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ip_assets_set_updated_at
  before update on public.ip_assets
  for each row execute function public.set_updated_at();

create index ip_assets_owner_idx on public.ip_assets (owner_id);
create index ip_assets_published_idx on public.ip_assets (is_published) where is_published = true;
