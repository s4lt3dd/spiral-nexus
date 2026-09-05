-- IP-office ingestion: official register records + the trademark non-use radar.
--
-- Guardrail #1 (docs/STRATEGY.md §5a): register data is INTELLIGENCE, NOT
-- SUPPLY. It lives in its own table, strictly separate from user-submitted
-- ip_assets, is never rendered as a listing, and never implies that its owner
-- wants to deal. Flooding browse with register records is the failure mode
-- that killed every prior IP marketplace.
--
-- Guardrail #2: the app's API surface can NEVER read this table. anon and
-- authenticated are explicitly revoked (Supabase default privileges would
-- otherwise grant them select on new objects). Reads happen only through:
--   * the service-role client (ingestion write path, server-only), and
--   * the dedicated read-only `register_reader` role used by the internal
--     matching MCP (mcp/register-server) - which is granted select on ONLY
--     the two register objects, so it is structurally incapable of touching
--     user, listing, or message data.
--
-- The non-use clock (Art. 18 EUTMR): an EU trade mark must be put to genuine
-- use within 5 years of its REGISTRATION date, or it becomes vulnerable to
-- revocation for non-use. `grace_period_ends` = registration_date + 5 years.
-- Register data cannot show actual use, so the radar surfaces EXPOSURE
-- (candidates), never proof of non-use.

-- ---------- enums ----------

-- Registries we may ingest from. Only 'euipo' is wired today; the rest are
-- reserved so adding a source never needs a schema change.
create type public.registry as enum ('euipo', 'ukipo', 'uspto', 'wipo');

-- Normalised lifecycle status. Office-specific raw wording is preserved in
-- status_raw; lib/ingestion/normalize.mjs owns the mapping.
create type public.office_record_status as enum
  ('registered', 'pending', 'expired', 'opposed', 'withdrawn', 'other');

-- ---------- table ----------

create table public.ip_office_records (
  id uuid primary key default gen_random_uuid(),
  registry public.registry not null,
  -- The registry's own identifier (e.g. EUTM application number).
  office_ref text not null,
  mark_text text,
  -- Word / Figurative / Combined etc., as reported by the office.
  mark_kind text,
  mark_image_url text,
  nice_classes int[] not null default '{}',
  status public.office_record_status not null default 'other',
  status_raw text,
  filing_date date,
  registration_date date,
  expiry_date date,
  -- Art. 18 EUTMR: end of the 5-year genuine-use grace period. Calendar math
  -- (not day counts), computed in the database so it can never drift from
  -- registration_date.
  grace_period_ends date generated always as
    ((registration_date + interval '5 years')::date) stored,
  owner_name text,
  owner_country text,
  territory text[] not null default '{}',
  office_url text,
  -- The office's own "status as of" date, when provided.
  source_updated_at date,
  -- Full source payload, for reprocessing without refetching.
  raw jsonb,
  ingested_at timestamptz not null default now(),
  unique (registry, office_ref)
);

-- Same sanity rails as ip_assets (see 20260709* migrations): valid Nice
-- classes only, bounded array sizes, dates inside a sane window.
alter table public.ip_office_records
  add constraint ip_office_records_nice_classes_range
    check (
      nice_classes <@ array[
        1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,
        24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45
      ]
    ),
  add constraint ip_office_records_array_sizes
    check (
      coalesce(array_length(nice_classes, 1), 0) <= 45
      and coalesce(array_length(territory, 1), 0) <= 60
    ),
  add constraint ip_office_records_dates_sane
    check (
      (filing_date is null
        or filing_date between date '1875-01-01' and date '2100-12-31')
      and (registration_date is null
        or registration_date between date '1875-01-01' and date '2100-12-31')
      and (expiry_date is null
        or expiry_date between date '1875-01-01' and date '2100-12-31')
    );

-- Radar scan: registered marks ordered by how close the clock is.
create index ip_office_records_status_grace_idx
  on public.ip_office_records (status, grace_period_ends);

-- Nice-class containment filters (mirrors ip_assets_nice_classes_idx).
create index ip_office_records_nice_classes_idx
  on public.ip_office_records using gin (nice_classes);

-- Trigram similarity over mark text: powers the MCP's find_similar_marks now
-- and listing-verification (user listing <-> register match) next slice.
-- pg_trgm already exists (20260614204057_discovery_search_indexes.sql).
create index ip_office_records_mark_text_trgm_idx
  on public.ip_office_records using gin (mark_text gin_trgm_ops);

-- ---------- access control ----------

alter table public.ip_office_records enable row level security;

-- Supabase default privileges grant select/insert/... on every new object to
-- anon + authenticated (RLS is normally the gate). This table is not user
-- data, so revoke outright: the PostgREST API errors instead of returning
-- rows, whatever policies exist now or later.
revoke all on public.ip_office_records from anon, authenticated;

-- Dedicated read-only role for the internal matching MCP. Created NOLOGIN;
-- the founder enables login + sets the password out-of-band (dashboard SQL
-- editor - see docs/INGESTION.md). Roles are cluster-wide, so guard the
-- create for re-runs against local shadow databases.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'register_reader') then
    create role register_reader nologin;
  end if;
end $$;

grant usage on schema public to register_reader;
grant select on public.ip_office_records to register_reader;

-- pg_trgm may live in the `extensions` schema on hosted Supabase; the MCP
-- calls similarity()/<-> directly, so the role needs usage there too.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    grant usage on schema extensions to register_reader;
  end if;
end $$;

-- RLS applies to register_reader like any non-bypass role, so give it an
-- explicit read policy (its ONLY capability on its ONLY visible table).
create policy "register readers can read office records"
  on public.ip_office_records for select
  to register_reader
  using (true);

-- ---------- non-use radar ----------

-- Ranked outreach-candidate view over registered marks with a running clock.
-- security_invoker: querying as register_reader re-checks the table grant +
-- RLS as register_reader, so the view can never widen access.
-- Buckets:
--   vulnerable  - grace period already ended; revocable for non-use today
--   approaching - grace period ends within 180 days
--   watch       - registered, clock running, >180 days of room
create view public.trademark_non_use_radar
  with (security_invoker = true) as
select
  r.id,
  r.registry,
  r.office_ref,
  r.mark_text,
  r.mark_kind,
  r.nice_classes,
  r.filing_date,
  r.registration_date,
  r.expiry_date,
  r.grace_period_ends,
  (r.grace_period_ends - current_date) as days_to_grace_end,
  case
    when r.grace_period_ends < current_date then 'vulnerable'
    when (r.grace_period_ends - current_date) <= 180 then 'approaching'
    else 'watch'
  end as radar_bucket,
  r.owner_name,
  r.owner_country,
  r.office_url
from public.ip_office_records r
where r.status = 'registered'
  and r.grace_period_ends is not null
order by r.grace_period_ends asc;

revoke all on public.trademark_non_use_radar from anon, authenticated;
grant select on public.trademark_non_use_radar to register_reader;
