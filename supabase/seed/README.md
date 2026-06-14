# Seed data

Listings depend on real auth users (RLS ties `ip_assets.owner_id` to a profile,
which mirrors `auth.users`), so seeding creates test owners first, then attaches
demo trademarks to them.

Both scripts read `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. The service-role key is used
only by these local scripts and is never shipped to the browser.

## `seed.mjs`

Creates two test owners and inserts 8 trademark listings across them (6
published, 2 draft) with varied jurisdictions, Nice classes, statuses, and deal
types — enough to make the dashboard and the upcoming browse/search demo well.
Idempotent: re-running clears the seed listings for those owners and reinserts.

```bash
node supabase/seed/seed.mjs
```

Test owners (password `SpiralNexus!Test123`):
- `owner-a@spiralnexus.test`
- `owner-b@spiralnexus.test`

## `verify-rls.mjs`

Exercises the `ip_assets` RLS policies using real user sessions and the anon key
(never the service role), asserting that:
- an owner cannot read / update / delete another owner's rows,
- published listings are cross-readable (the marketplace must work),
- anonymous users see only published rows, never drafts,
- an owner can create / update / delete their own listing.

Run it after seeding:

```bash
node supabase/seed/verify-rls.mjs
```

Exits non-zero if any check fails.
