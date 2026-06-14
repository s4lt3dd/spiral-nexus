# Seed data

Listings depend on real auth users (RLS ties `ip_assets.owner_id` to a profile,
which mirrors `auth.users`), so seeding creates test owners first, then attaches
demo trademarks to them.

Both scripts read `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. The service-role key is used
only by these local scripts and is never shipped to the browser.

## `seed.mjs`

Creates the test owners and inserts trademark listings across them (most
published, a few drafts) with branded SVG mark medallions, varied jurisdictions,
Nice classes, statuses, and deal types. It then seeds a couple of **demo
conversations** — including one addressed to the **first real (non-seed) user**
as the buyer, so you can test messaging in a single window. Idempotent.

```bash
node supabase/seed/seed.mjs
```

The messaging part is skipped with a notice until the messaging migration is
applied (`npm run db:push`); re-run the seed afterwards to get the demo threads.

Test owners (password `SpiralNexus!Test123`):
- `owner-a@spiralnexus.test`, `owner-b@spiralnexus.test`, `owner-c@spiralnexus.test`

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

## `verify-messaging.mjs`

Exercises the `conversations` / `messages` RLS using real user sessions,
asserting that a buyer can start a thread and post, the owner can read and
reply, and an outsider **cannot** read/post, that **sender spoofing** and
**buyer spoofing** are blocked, and that **self-contact** is rejected. Requires
the messaging migration applied (`npm run db:push`) and a prior seed run.

```bash
node supabase/seed/verify-messaging.mjs
```
