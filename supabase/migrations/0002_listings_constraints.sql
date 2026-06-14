-- Slice 1: cheap, defence-in-depth CHECK constraints on ip_assets.
-- The per-owner listing cap is enforced in the server action (lib/tiers + the
-- PAYMENTS_ENABLED allowance), not here, so this migration stays trivial.

-- Title must be present and within a sane length (mirrors the Zod boundary).
alter table public.ip_assets
  add constraint ip_assets_title_len
  check (char_length(title) between 1 and 120);

-- Nice classification for trademarks runs 1..45. Null is allowed (optional).
alter table public.ip_assets
  add constraint ip_assets_nice_class_range
  check (nice_class is null or nice_class between 1 and 45);
