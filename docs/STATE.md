# Spiral Nexus — repository state audit

*Audit date: 2 September 2026. Branch: `feat/euipo-ingestion` (zero commits
ahead of `main`; the whole ingestion slice is uncommitted working-tree
changes — see §8.1). Written as step 0 before adding an evaluation and
self-improvement loop. Nothing in the codebase was changed by this audit.*

**Headline.** Spiral Nexus is a Next.js + Supabase two-sided hub for
user-submitted trademark listings, with a brand-new, fixture-only EUIPO
register-ingestion slice and a read-only MCP over it. There is **no LLM
call, no prompt, no model name, no similarity verdict, no entity
resolution, no monitoring loop, and no persisted reasoning anywhere in the
repo.** The only "similarity" is Postgres `pg_trgm`. Every artefact the
eval loop needs (verdict store, reasoning store, corrections, prompt
registry, golden set, backtest harness) is greenfield.

Legend: **UNCERTAIN** marks anything not verifiable from the code.

---

## 1. Architecture

### 1.1 Entry points

| Entry point | Path | Notes |
|---|---|---|
| Next.js App Router pages | `app/(marketing)/**`, `app/(auth)/login/page.tsx`, `app/(app)/**`, `app/onboarding/page.tsx` | Server components; all `(app)` pages call `createClient()` from `lib/supabase/server.ts` and `redirect("/login")` when unauthenticated. |
| Request proxy (middleware) | `proxy.ts` → `updateSession()` in `lib/supabase/middleware.ts` | Refreshes the Supabase session on every non-asset request; `protectedPrefixes` = `/dashboard /messages /listings /network /saved /registries /u /onboarding`. |
| The only route handler | `app/auth/callback/route.ts` (`GET`) | Exchanges the magic-link code via `supabase.auth.exchangeCodeForSession`. **There is no `app/api/` directory.** |
| Server actions | `app/(app)/listings/actions.ts`, `listings/like-actions.ts`, `messages/actions.ts`, `saved/actions.ts`, `u/actions.ts`, `dashboard/account/actions.ts`, `dashboard/profile/actions.ts` | All mutations go through server actions with Zod schemas in `lib/validation/*.ts`. |
| Node scripts (manual) | `supabase/seed/seed.mjs`, `supabase/seed/seed-office-records.mjs`, `supabase/seed/verify-*.mjs` | Read `.env.local` directly via a local `loadEnv()`; use the service-role key. Not wired to CI. |
| MCP server (stdio) | `mcp/register-server/index.mjs` | Separate `package.json`; started via `claude mcp add … -- node mcp/register-server/index.mjs`. |

### 1.2 Services / processes

- One Next.js app (Vercel target per `CLAUDE.md`; there is no `vercel.json`
  and `next.config.ts` is empty).
- One optional stdio MCP process (`spiral-nexus-register`, version `0.1.0`).
- **No background workers, no cron, no queues.** `supabase/config.toml`
  enables `edge_runtime`, `realtime`, `analytics`, `storage.vector` locally,
  but nothing in the repo uses edge functions, vector buckets, or pgvector.

### 1.3 Data stores (Supabase Postgres, `supabase/migrations/`)

| Object | Migration | Purpose |
|---|---|---|
| `profiles` | `0001_init.sql`, extended by `20260621120000_profiles_extend.sql`, `20260709150000_profiles_country.sql` | User identity; `handle_new_user()` trigger on `auth.users`. |
| `ip_assets` | `0001_init.sql`, `0002_listings_constraints.sql`, `20260709120000_listings_expansion.sql`, `20260709140000_listings_expansion_hardening.sql` | User-submitted listings. Has `source public.asset_source` (`user_submitted` \| `ip_office`) — the `ip_office` value is declared but **never written anywhere** (only appears in `lib/types.ts` `AssetSource`). |
| `ip_assets.search` + `pg_trgm` | `20260614204057_discovery_search_indexes.sql` | FTS column + trigram index on `title`. |
| `conversations`, `messages`, `conversation_reads` | `20260614224933_messaging.sql`, `20260621150000_realtime_messaging.sql` | 1:1 messaging; `messages` is in the `supabase_realtime` publication. |
| `saved_listings`, `follows`, `listing_likes`, `saved_counts()` | `20260621130000_saved_listings.sql`, `20260621140000_follows.sql`, `20260709160000_engagement.sql` | Social layer. |
| Storage buckets `listing-images`, `listing-docs`, `avatars` | `20260709120000_listings_expansion.sql`, `20260718120000_avatars_bucket.sql` | Files. |
| **`ip_office_records`** (table), **`trademark_non_use_radar`** (view), enums `registry`, `office_record_status`, role `register_reader` | `20260830120000_ip_office_ingestion.sql` (**uncommitted**) | Register intelligence. See §2 and §5. |

No generated DB types exist (`lib/database.types.ts` is referenced in a
comment in `lib/types.ts` but absent); hand-written interfaces in
`lib/types.ts` are the type layer.

### 1.4 External APIs

| Service | Status | Where |
|---|---|---|
| Supabase (Auth/Postgres/Storage/Realtime) | Live | `lib/supabase/{server,client,middleware}.ts`; project ref `fsbpvnfxqgticxhkiqvs` in `supabase/MIGRATIONS.md`. |
| Stripe | **Not integrated** (env vars reserved; `PAYMENTS_ENABLED=false`) | `.env.example`, `lib/tiers.ts`, `lib/listings.ts`. |
| EUIPO (Open Data Portal or eSearch Plus) | **Not wired**; `INGESTION_LIVE=true` throws | `lib/ingestion/sources/euipo.mjs` `fetchBatch()`. |
| USPTO / UKIPO / EUIPO / WIPO search sites | Outbound links only (no fetch) | `lib/registries.ts` `REGISTRIES`, `registryUrl()`, `isLandingOnly()`. |
| Any LLM provider | **None.** No SDK dependency, no API key in `.env.example`. | — |

---

## 2. Registry ingestion

### 2.1 Which registries are wired

| Registry | Enum reserved (`public.registry`, `lib/types.ts` `Registry`) | Adapter | Data path |
|---|---|---|---|
| EUIPO | yes | `lib/ingestion/sources/euipo.mjs` (`EUIPO_SOURCE`) | **Fixture only** — `lib/ingestion/sources/euipo.sample.json` (30 rows). |
| UKIPO | yes | none | — |
| USPTO | yes | none | — |
| WIPO | yes | none | — |

`lib/registries.ts` also lists the same four offices, but that module is
the outbound "search the IP offices" page (`app/(app)/registries/page.tsx`,
`components/registries/registry-search.tsx`) and has nothing to do with
ingestion.

### 2.2 Pipeline shape

Interfaces in `lib/ingestion/types.ts`:
`RegistrySource { id; fetchBatch(opts?: FetchBatchOptions): Promise<unknown[]>; parse(payloads): NormalizedOfficeRecord[] }`
and `NormalizedOfficeRecord` (mirrors the table minus `id`,
`grace_period_ends`, `ingested_at`).

1. **Fetch** — `EUIPO_SOURCE.fetchBatch({ limit? })`: if
   `process.env.INGESTION_LIVE === "true"` it **throws** (`TODO(live)` in
   the file header); otherwise `readFixture()` reads the JSON fixture and
   slices to `limit`. No pagination, no date/class windowing, no HTTP.
2. **Parse / normalise** — `EUIPO_SOURCE.parse()` → private `parseOne()`
   maps an eSearch-Plus-shaped object using pure helpers in
   `lib/ingestion/normalize.mjs`:
   - `normalizeStatus(raw)` — ordered substring rules onto
     `registered | pending | expired | opposed | withdrawn | other`;
     unknown → `other` (deliberately never guesses `registered`);
     "Registration cancellation pending" → `withdrawn`.
   - `parseIsoDate(value)` — accepts `yyyy-mm-dd`, ISO datetime,
     `dd/mm/yyyy`, `yyyymmdd`; rejects impossible dates.
   - `normalizeNiceClasses(value)` — sorted, de-duplicated ints in 1–45.
   - `cleanText(value)` — trim-or-null.
   - Owner: **only `applicants[0]`** is read (`name`, `countryCode`
     upper-cased). Co-applicants are dropped.
   - `territory` hard-coded `["EU"]`; `office_url` templated from
     `applicationNumber`; full payload kept in `raw`.
3. **Store** — `upsertOfficeRecords(client, records)` in
   `lib/ingestion/upsert.mjs`: chunks of `CHUNK_SIZE = 500`, supabase-js
   `.upsert(rows, { onConflict: "registry,office_ref" })`, sets
   `ingested_at` to the run time on every row (so it means "last ingested").
   Requires a service-role client.
4. **Runner** — `supabase/seed/seed-office-records.mjs` (`main()`) is the
   only caller today. The deferred live runner
   (`app/api/ingestion/euipo/route.ts` + `INGESTION_SECRET` + Vercel Cron +
   `lib/supabase/admin.ts`) is described in `docs/INGESTION.md` but does not
   exist.

### 2.3 Storage model

`ip_office_records` (`20260830120000_ip_office_ingestion.sql`): unique
`(registry, office_ref)`; `grace_period_ends` is a **stored generated
column** = `registration_date + interval '5 years'`; CHECK constraints on
Nice range, array sizes, and date window; indexes on
`(status, grace_period_ends)`, GIN on `nice_classes`, GIN trigram on
`mark_text`. RLS enabled; `anon`/`authenticated` **revoked outright**;
`register_reader` gets SELECT + a `using (true)` policy.

**No history.** An upsert overwrites the row; there is no status-change
log, no `first_seen`, no per-run audit table. Detecting "new applications
since last run" (needed by the monitoring step) is not possible from the
current schema. UNCERTAIN whether `raw` diffs could reconstruct it after
the fact — they cannot, since `raw` is also overwritten.

---

## 3. Entity resolution

**Does not exist.** There is no owner/applicant table, no canonical entity
id, no cross-registry key, and no rule file.

- Owner identity is two denormalised columns on each record:
  `owner_name text`, `owner_country text` (`ip_office_records`), populated
  by `parseOne()` as described in §2.2.
- The MCP's `search_register` tool matches owners by
  `owner_name ilike '%' || $1 || '%'` — substring only.
- The fixture has 30 rows and 30 distinct `owner_name` values, so nothing
  has ever exercised a duplicate-owner case.
- Nothing is LLM-driven (there is no LLM).
- The only "dedupe" helpers in the repo are unrelated UI utilities
  (`components/ui/chips-input.tsx`, `lib/validation/listing.ts` Nice-class
  dedupe, `components/messages/message-thread.tsx` message-id dedupe).

Step 1 (`sn-1-invariants`) asks for "what 'same entity' means" — that will
have to be defined from scratch, not observed.

---

## 4. Similarity / clearance

### 4.1 The exact code path from "user enters a mark" to "verdict"

**There is no verdict.** Two text-matching surfaces exist, neither of
which produces an outcome, score, reasoning, or persisted result:

**(a) Internal MCP — `find_similar_marks`** (`mcp/register-server/index.mjs`)

1. Staff member types into a Claude client attached to the MCP.
2. Tool input validated by zod: `text` (2–120 chars), optional
   `nice_class`, `limit` (clamped 1–50 via `clamp()`).
3. One parameterised SQL query as `register_reader`:
   `round(similarity(mark_text, $1)::numeric, 3) as similarity … order by mark_text <-> $1 limit $3`
   — i.e. **`pg_trgm` trigram distance only**. No phonetic, visual,
   conceptual, or goods/services comparison.
4. Returns `{ query, matches }` JSON to the model. Any "verdict" is then
   formed ad hoc in the chat session by whatever model the operator is
   using. **UNCERTAIN which model** — the repo pins none; the MCP is
   registered with `claude mcp add`.
5. Nothing is written back: the role is read-only and the session sets
   `default_transaction_read_only = on`.

**(b) Product browse — `searchListings()`** (`lib/discovery.ts`)

`discoveryParamsSchema` (Zod) → `toPrefixTsquery()` builds
`search.fts(english)` prefix query OR `title.ilike` on **`ip_assets`
only** (user listings, never register data). This is discovery, not
clearance.

**(c) Registries page** (`app/(app)/registries/page.tsx`)

Opens the official office search landing page in a new tab and copies the
query to the clipboard (`RegistrySearch` `onOpen()`). No lookup, no result.

### 4.2 Prompts, models, post-processing

None in the repo. Grep for `anthropic|openai|claude-|gpt|llm|embedding|prompt|model`
over `*.ts,*.tsx,*.mjs,*.sql,*.yml,*.toml` hits only: comments in
`mcp/register-server/index.mjs` ("ask a model…", "upgrades to semantic
embeddings in the vector slice"), the Supabase Studio `openai_api_key`
line in `supabase/config.toml`, and unrelated word matches.

### 4.3 Is the model's reasoning persisted?

No. There is no table, file, or log for verdicts or reasoning. The
`matches` table sketched in `docs/MVP-SPEC.md` §data model
(`id, asset_id, user_id, score, reason, status`) was never created.

---

## 5. Dormancy index and monitoring

### 5.1 What exists

A **single-signal exposure view**, not an index:

- `grace_period_ends` generated column (Art. 18 EUTMR: registration + 5
  calendar years), `ip_office_records`.
- `trademark_non_use_radar` view (`security_invoker = true`): rows where
  `status = 'registered' and grace_period_ends is not null`, adds
  `days_to_grace_end` and `radar_bucket`:
  `vulnerable` (grace ended) / `approaching` (≤180 days) / `watch` (>180).
- Exposed via MCP `non_use_radar` (bucket / Nice-class filters, limit ≤100)
  and summarised by `describe_data`.
- TS mirrors: `RadarBucket`, `RadarRow` in `lib/types.ts`.
- The docs are explicit that this is "exposure candidates, never proof of
  non-use" (`docs/INGESTION.md`, `docs/STRATEGY.md` §7 #1).

Signals **not** modelled: renewal status, proof-of-use / Section 8 & 71
filings, non-use cancellation actions, owner dissolution (Companies House
etc.), assignment/transaction dates, any use evidence. `expiry_date` is
stored but unused by the view. The EU-specific 5-year rule is applied to
every registry in the enum with no per-registry variation.

### 5.2 Monitoring

Nothing. No watch list, no polling loop, no "new applications since last
run" (see §2.3 — no history), no alerts, no cron, no scheduled job. The
only "watch" in the codebase is the radar bucket name.

### 5.3 What is planned (docs only)

`docs/INGESTION.md` "What the data powers next": (1) radar → concierge
outreach via MCP (present), (2) listing verification by matching
`ip_assets` to `ip_office_records` on `registry + office_ref` and trigram
on names, (3) valuation comparables, (4) embeddings over register +
listings + buyer intent. `CLAUDE.md` still lists "verification automation"
and "productized AI matchmaking" as deferred.

---

## 6. Tests

### 6.1 Unit suite (runs in CI)

- Runner: Vitest 4 (`vitest.config.mts`: jsdom, `pool: "threads"`,
  `include: test/**/*.test.{ts,tsx}`, setup `test/setup.ts`).
- Verified this audit: **19 files, 281 tests, all passing** (`npm test`).
- Ingestion coverage: `test/lib/ingestion.test.ts` — `normalizeStatus`,
  `parseIsoDate`, `normalizeNiceClasses`, `cleanText`, `EUIPO_SOURCE.parse`
  (full record, figurative mark, skip-without-id), and
  `EUIPO_SOURCE.fetchBatch` fixture-mode invariants (≥25 rows, every status
  present, registration-date bands that keep all three radar buckets
  populated "until early 2027", `limit` respected).
- Other `test/lib/*`: tiers, listings, discovery, members, engagement,
  follows, inbox, messaging, profile, registries (outbound-URL logic),
  utils, and the three Zod schemas. `test/components/*`: four components.
- `test/helpers/supabase-mock.ts` fakes the PostgREST builder; **no test
  touches a database**. `test/README.md` records the standing gap:
  "TODO (integration): row-level security is untested."

### 6.2 CI

`.github/workflows/ci.yml` — on push to `main` and PRs to `main`: Node 24,
`npm ci` (with `.npmrc` `ignore-scripts=true`), `npm run lint`,
`npm run build` (also type-checks), `npm test`. No Supabase, no migration
apply, no verify scripts, no MCP tests.

### 6.3 Manual verification scripts (not in CI)

`supabase/seed/verify-ingestion.mjs` (idempotency, grace math incl.
29 Feb → 28 Feb, radar membership/bucketing/day counts, anon + authenticated
hard-denied on table and view); `mcp/register-server/verify.mjs`
(`register_reader` can read the two objects, cannot read `profiles` /
`ip_assets` / `messages`, cannot insert/delete). Both need `.env.local` and
a live project; the MCP one also needs the role's password set out-of-band.

### 6.4 Fixtures with real decisions

**None.** `lib/ingestion/sources/euipo.sample.json` is 30 synthetic
eSearch-Plus-shaped EUTMs (22 Registered, 2 Expired, 1 each of
Application published / under examination / filed, Opposition pending,
Withdrawn, Registration cancellation pending; 30 fictional owners such as
"Veldane Apparel GmbH"). UNCERTAIN whether the `applicationNumber` values
collide with real EUTM numbers; the names and owners are invented. There
are no opposition / cancellation decisions, no mark pairs, no outcomes.

---

## 7. Configuration

### 7.1 Where prompts and model names live

Nowhere — none exist. There is no `prompts/`, no `evals/`, no `Makefile`,
no `src/` (the `sn-6-hooks` command references `src/**` and `make backtest`;
this repo uses `app/`, `lib/`, `components/` and npm scripts).

### 7.2 Runtime configuration (env vars, `.env.example`)

| Var | Read by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app clients; seed/verify scripts |
| `SUPABASE_SERVICE_ROLE_KEY` | seed/verify scripts only (no app-side admin client exists) |
| `PAYMENTS_ENABLED` | `lib/listings.ts`, `lib/messaging.ts` (bounded free allowance while `!== "true"`) |
| `INGESTION_LIVE` | `EUIPO_SOURCE.fetchBatch()` (throws when `"true"`) |
| `EUIPO_API_CLIENT_ID/_SECRET` | declared, **unread** |
| `REGISTER_READONLY_DATABASE_URL` | `mcp/register-server/{index,verify}.mjs` |
| `STRIPE_*` | declared, unread |

`.env*` is gitignored; `.claude/settings.json` denies Write/Edit on `.env`
and `.env.local`.

### 7.3 Versioning

Git only. No prompt hashing, no model pin, no config registry. The MCP has
its own `package.json` (`zod ^3.25`, `pg ^8.13`, `@modelcontextprotocol/sdk
^1.12` — caret ranges, unlike the app's exact pins) and a separate
`node_modules` (`.gitignore` addition on this branch).

### 7.4 Claude Code harness config (`.claude/`)

- `settings.json`: allow-list for git/gh/npm/tsc; deny list (`rm -rf`,
  force-push, `db reset`, env writes); **one PreToolUse hook** —
  `npx tsc --noEmit && npm run lint || exit 2` gated on `Bash(git commit:*)`.
- `settings.local.json`: broader local allow (`git:*`, `gh:*`, `node:*`,
  `python:*`, `npx supabase:*`).
- The ten-step plan this audit begins (`sn-0…sn-9-*.md`) lives in the
  user-level `~/.claude/commands/`, deliberately outside the repo.
- `skills/spiral-nexus-architecture`, `skills/vertical-slice`,
  `skills/ui-ux-pro-max`; `launch.json` runs `npm run dev` on 3000.

---

## 8. Gaps for the eval loop

### 8.1 Repository hygiene (do first)

- **The entire ingestion slice is uncommitted.** `git log main..HEAD` is
  empty; `docs/INGESTION.md`, `docs/STRATEGY.md`, `lib/ingestion/`, `mcp/`,
  the migration, both new seed scripts, and the ingestion test are
  untracked, and `CLAUDE.md`, `.env.example`, `.gitignore`, `lib/types.ts`
  are modified. Steps 1–9 build on files that are not yet in git.
  *(Resolved 2 Sep 2026: committed as `feat(ingestion)` on this branch.)*
- `20260830120000_ip_office_ingestion.sql` **is applied to the linked
  project** (`npm run db:list`, 2 Sep 2026: local and remote both show it).
  So production already has `ip_office_records`, the radar view and the
  `register_reader` role, while the SQL that created them exists only in
  an untracked file on one machine.
- `CLAUDE.md` is truncated mid-sentence at the end ("`npx supabase gen types
  typescr`"). Step 1 rewrites it anyway.

### 8.2 Not persisted (required by `sn-3-corrections`)

| Need | Current state |
|---|---|
| Verdict storage (inputs, outcome, confidence, cited marks, timestamp) | none — no table, no type |
| Reasoning storage (full text) | none |
| Model name + prompt version hash on each verdict | none; no model, no prompt |
| Corrections `{ verdict_id, corrected_outcome, category, reviewer, comment }` | none |
| Reviewer identity | no staff/admin role or claim exists in the app (`profiles.role_flags` is free-form; MVP-SPEC's "Admin" actor was never built) |
| Prompt registry (`prompts/` + version) | none |
| Register change history (for monitoring "since last run") | none — upsert overwrites; `ingested_at` is last-touch only |

### 8.3 Stubbed / TODO / deferred in code

- `lib/ingestion/sources/euipo.mjs` `fetchBatch()` — `TODO(live)`; throws
  under `INGESTION_LIVE=true`.
- Deferred by design (`docs/INGESTION.md`): `app/api/ingestion/euipo/route.ts`,
  `INGESTION_SECRET`, Vercel Cron, `lib/supabase/admin.ts`.
- `ip_assets.source = 'ip_office'` enum value exists and is unused.
- `lib/database.types.ts` (generated types) does not exist.
- RLS integration tests: explicit TODO in `test/README.md`.
- Only `applicants[0]` ingested; co-applicants are lost at parse time
  (relevant to entity resolution later).
- Five-year rule applied uniformly to all registries in the enum; no
  per-registry `grace` rule exists (UKIPO also 5 years from registration
  completion; USPTO's Section 8/71 mechanics differ — UNCERTAIN of the
  intended scope, flagged for `sn-9-dormancy-research`).

### 8.4 Plan-vs-repo mismatches worth calibrating before steps 1–9

- `sn-3`, `sn-4`, `sn-5`, `sn-7`, `sn-8` assume an existing "similarity
  pipeline", "verdict code path", "similarity prompt in `prompts/`", and an
  "entity-resolution module". None exist; the first "v1" must be built
  (presumably before or inside step 3) for there to be anything to
  persist, back-test, or rebuild as v2.
- `sn-6` references `src/**` and `make backtest`; this repo has no `src/`
  or `Makefile` (npm scripts + `app/`/`lib/`).
- `sn-4` requires "a separate, cheaper Claude call" — the repo has no LLM
  dependency, API key, or client wrapper; adding one is a dependency
  decision under `CLAUDE.md`'s "ask before adding dependencies" rule.
- `sn-8` needs "new applications since last run" — requires a change log
  or `first_seen_at` on `ip_office_records` (§2.3), plus a live feed
  (§2.2) or a fixture that grows between runs.
- The MCP is the only place a model currently touches register data, and
  it is read-only by construction. Persisting verdicts from that surface
  would need either a write-capable path outside `register_reader` or a
  different surface (server action / route handler with a service-role
  client).
- Guardrails to preserve in any eval-loop schema: `ip_office_records`
  stays unreadable by `anon`/`authenticated`; verdict/correction tables must
  get RLS in the same migration (`CLAUDE.md`, `supabase/MIGRATIONS.md`).

---

## Appendix — quick file index

```
lib/ingestion/types.ts                 NormalizedOfficeRecord, RegistrySource, FetchBatchOptions
lib/ingestion/normalize.mjs            normalizeStatus, parseIsoDate, normalizeNiceClasses, cleanText
lib/ingestion/sources/euipo.mjs        EUIPO_SOURCE { fetchBatch, parse }, parseOne, readFixture
lib/ingestion/sources/euipo.sample.json 30 synthetic EUTMs
lib/ingestion/upsert.mjs               upsertOfficeRecords (CHUNK_SIZE 500, onConflict registry,office_ref)
supabase/migrations/20260830120000_ip_office_ingestion.sql
                                       ip_office_records, trademark_non_use_radar, register_reader
supabase/seed/seed-office-records.mjs  runner (service role)
supabase/seed/verify-ingestion.mjs     DB-level checks (manual)
mcp/register-server/index.mjs          tools: describe_data, search_register, non_use_radar, find_similar_marks
mcp/register-server/verify.mjs         role-scope proof (manual)
lib/registries.ts                      REGISTRIES, registryUrl, isLandingOnly (outbound links only)
lib/discovery.ts                       searchListings, discoveryParamsSchema (ip_assets FTS/trigram)
lib/types.ts                           Registry, OfficeRecordStatus, OfficeRecord, RadarBucket, RadarRow
test/lib/ingestion.test.ts             unit coverage for the above
.github/workflows/ci.yml               lint + build + vitest
.claude/settings.json                  tsc+lint PreToolUse hook on git commit
~/.claude/commands/sn-0..9-*.md        the eval-loop plan (user-level, not in repo)
docs/INGESTION.md, docs/STRATEGY.md    design + rationale
```
