-- Slice 2 (Discovery): search + filter performance for ip_assets.
-- No RLS changes — published listings are already world-readable (0001) and
-- profiles are public, which is all discovery needs.

-- Fuzzy/substring matching on trademark names (built-in extension, no external dep).
create extension if not exists pg_trgm;

-- Name-centric full-text search over title + description. Title is weighted
-- higher ('A') than description ('B') so brand-name hits rank first.
alter table public.ip_assets
  add column search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

-- FTS index (prefix queries like 'nim:*' use this).
create index ip_assets_search_idx on public.ip_assets using gin (search);

-- Trigram index on title for fuzzy / partial brand-name matching.
create index ip_assets_title_trgm_idx on public.ip_assets using gin (title gin_trgm_ops);

-- Filter indexes.
create index ip_assets_nice_class_idx on public.ip_assets (nice_class);
create index ip_assets_deal_type_idx on public.ip_assets (deal_type);
create index ip_assets_jurisdiction_idx on public.ip_assets (lower(jurisdiction));
