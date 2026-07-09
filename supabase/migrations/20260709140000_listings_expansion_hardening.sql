-- Slice B hardening (post-review):
--
-- 1. certificate_path must live in the OWNER's Storage folder. The server
--    action checks this, but "security is enforced at the database": a direct
--    PostgREST write could otherwise attach ANOTHER member's certificate to
--    the attacker's listing. Same-row CHECK ties the path prefix to owner_id.
-- 2. The filing-date CHECK compared against now()::date in UTC, which rejects
--    "today" for users ahead of UTC (e.g. NZT). Allow one day of tolerance.

alter table public.ip_assets
  add constraint ip_assets_certificate_owner_folder
    check (
      certificate_path is null
      or certificate_path like owner_id::text || '/%'
    );

alter table public.ip_assets
  drop constraint ip_assets_filing_date_sane;

alter table public.ip_assets
  add constraint ip_assets_filing_date_sane
    check (
      filing_date is null
      or filing_date between date '1875-01-01' and (now()::date + 1)
    );
