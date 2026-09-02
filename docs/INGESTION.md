# IP-office ingestion & the non-use radar

How Spiral Nexus ingests official trademark-register data, what it is for,
and how to activate the live pieces. Strategy context: `docs/STRATEGY.md`
§5b (the moat) and §7 #1 (the non-use radar — the demand-manufacturing
growth engine this subsystem exists to power).

## The two guardrails (non-negotiable)

1. **Intelligence, not supply.** Register records live in
   `ip_office_records`, strictly separate from user-submitted `ip_assets`.
   They are NEVER rendered as listings, never imply the owner wants to deal,
   and never let anyone claim an asset they didn't submit. Flooding browse
   with register data ("lots of listings, no buyers") is the failure mode
   that killed every prior IP marketplace.
2. **The app's API surface cannot read register data.** The migration
   revokes `anon` + `authenticated` outright (a hard error, not an empty
   result). Access paths are exactly two:
   - the **service-role** client, server-side only, for ingestion writes;
   - the read-only **`register_reader`** role used by the internal MCP,
     granted SELECT on only `ip_office_records` +
     `trademark_non_use_radar` — structurally incapable of reaching user,
     listing, or message data.

## The non-use clock (why the radar works)

Art. 18 EUTMR: an EU trade mark must be put to **genuine use within 5 years
of its registration date** (and any continuous 5-year suspension of use
after that), or it becomes revocable for non-use. Licensing counts as use.
The office never warns owners when the clock runs out.

- `grace_period_ends` = `registration_date + 5 years` (generated column —
  calendar math, computed in the database).
- `trademark_non_use_radar` ranks registered marks by that clock:
  - **vulnerable** — grace period ended; revocable for non-use today;
  - **approaching** — grace period ends within 180 days;
  - **watch** — registered, clock running, >180 days of room.
- Register data cannot show actual *use*, so radar rows are **exposure
  candidates, never proof of non-use** — frame all outreach that way.

## Architecture

```
lib/ingestion/
  types.ts             TS shapes (NormalizedOfficeRecord, RegistrySource)
  normalize.mjs        pure mapping: status/date/Nice-class normalisation
  sources/euipo.mjs    EUIPO adapter (fixture mode until INGESTION_LIVE)
  sources/euipo.sample.json   ~30 realistic EUTMs (all statuses + buckets)
  upsert.mjs           idempotent upsert keyed on (registry, office_ref)
supabase/seed/seed-office-records.mjs    the runnable write path today
supabase/seed/verify-ingestion.mjs       slice verification (see below)
mcp/register-server/   read-only concierge MCP (see its README)
```

Adding a registry later (UKIPO/USPTO/WIPO — enum values already reserved)
means writing one adapter that satisfies `RegistrySource`; the core never
changes. Implementation is JSDoc-typed `.mjs` so the identical code runs in
Node scripts, Vitest, and (at activation) Next.js route handlers.

Run order for a fresh database:

```bash
npm run db:push
node supabase/seed/seed.mjs
node supabase/seed/seed-office-records.mjs
node supabase/seed/verify-ingestion.mjs
```

## Activation 1 — the live EUIPO feed (currently fixture mode)

`INGESTION_LIVE=false` (default): `seed-office-records.mjs` ingests the
committed fixture — full pipeline, no external dependencies. The fixture's
registration dates keep all three radar buckets populated until early 2027;
regenerate the date bands after that if you still need the demo data.

To go live, pick ONE feed and wire it into
`lib/ingestion/sources/euipo.mjs` (`fetchBatch`, at the `TODO(live)` mark):

| Feed | Nature | Use for |
|---|---|---|
| **EUIPO Open Data Portal** | Full EUTM register, bulk XML, free, updated daily, no licence | Full syncs |
| **eSearch Plus REST API** | OAuth2 + JSON (`EUIPO_API_CLIENT_ID`/`_SECRET`) | Bounded/incremental pulls |

Rules for live pulls: always **bounded** (Nice class and/or filing-date
window — never the whole multi-million-row register), and re-runs are safe
by construction (idempotent upsert). At that point also add the deferred
`app/api/ingestion/euipo/route.ts` (POST, secret-gated via
`INGESTION_SECRET`) + a Vercel Cron entry, and a `lib/supabase/admin.ts`
service-role factory for it — deliberately not built while the fixture path
is the only caller.

## Activation 2 — enable the register MCP (founder, one-time)

The migration creates `register_reader` as **NOLOGIN** with no password —
credentials never live in a migration. To activate:

1. Supabase dashboard → SQL editor:
   ```sql
   alter role register_reader with login password '<generate-a-strong-one>';
   ```
2. Build the connection string (direct connection):
   `postgresql://register_reader:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`
   (Via the pooler, the username becomes `register_reader.<project-ref>`.)
3. `cd mcp/register-server && npm install`, then register with Claude —
   command in `mcp/register-server/README.md`.
4. Prove the scope: `npm run verify` there (asserts it reads the two
   register objects and is denied everything else, including writes).

Keep the password out of the repo; `.env.local` may hold
`REGISTER_READONLY_DATABASE_URL` for local verify runs (`.env*` is
gitignored).

## What the data powers next (build order)

1. **Non-use radar → concierge outreach** (this slice, via the MCP): find
   marks near grace-end, match to buyer intent, broker introductions
   manually — the strategy's "first 100 deals by hand".
2. **Verification** (next): auto-match user listings to register records
   (`registry + office_ref`, trigram on names — the index already exists) →
   live status + a data-earned verified badge.
3. **Valuation comparables**: the register is the population; platform deals
   supply prices.
4. **Matching / vector slice**: embeddings over `ip_office_records` +
   listings + buyer intent; `find_similar_marks` upgrades from trigram to
   semantic.

## Verification (what `verify-ingestion.mjs` proves)

- Re-ingesting the same batch is idempotent (row count stable).
- `grace_period_ends` = registration + 5 calendar years on every dated row.
- Radar membership = exactly the `registered` marks with a clock; buckets
  agree with `days_to_grace_end`; day counts agree with the calendar.
- `anon` and `authenticated` get hard errors on the table AND the view, for
  reads and writes.
- Role-scope proof for `register_reader` lives in
  `mcp/register-server/verify.mjs` (needs the activated login).
