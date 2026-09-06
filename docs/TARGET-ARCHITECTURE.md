# Target architecture & hardening checklist

Assessment of the Spiral Nexus codebase (main at `debc346`, 5 Sept 2026) to
choose the infrastructure it moves to after the free pre-launch phase, and the
bar that "hardened" has to clear before cutover. Companion to
`docs/STATE.md` (what exists) and `docs/STRATEGY.md` (why).

Decision context: founders are not demoing yet, no feature pressure, the
product is at the "MCP stage". The founder wants off Supabase and Vercel onto
a stack they run themselves, at low cost, and wants the devops learning that
comes with it. Clerk is the planned auth provider.

Prices below are list prices as of writing and need re-checking at purchase.

---

## 0. Verdict in one paragraph

This is a small, stateless Next.js server in front of a small Postgres
database, plus three object-storage buckets and two live-update subscriptions.
Nothing in it needs serverless, and nothing in it needs more than one modest
VM. **Recommendation: a single Hetzner VPS (2 vCPU / 4 GB, ~€4.5/month)
running Docker containers deployed by Kamal 2 from GitHub Actions, Postgres 16
on the same box with WAL backups to Cloudflare R2, R2 for object storage,
Clerk for auth decoupled from the database through one Postgres function, and
Grafana Cloud's free tier for observability.** Total run cost is in the €5–10
per month range including a staging box. A PaaS would cost more, teach less,
and give back nothing this codebase needs.

---

## 1. State & storage

### What the app itself holds

| Question | Finding | Evidence |
|---|---|---|
| Local in-process state | None. Every request reads from Postgres. | No module-level caches or singletons in `app/`, `components/`, `lib/` beyond client factories. |
| Local filesystem writes | None at runtime. | The only `node:fs` import in runtime-adjacent code is `lib/ingestion/sources/euipo.mjs`, which reads the committed fixture. It is invoked by seed scripts, not by request handlers. |
| Session state | Cookie-based, no server session store. | `@supabase/ssr` cookies today; Clerk cookies after the move. |
| Persistent DB connection | Yes, one Postgres. | 14 migrations, 9 tables, 35 RLS policies, 1 extension (`pg_trgm`). |

Consequence: the app container is disposable and horizontally scalable with
zero coordination. Restart, replace, or run two of it freely.

### The database

Postgres is the only correct choice and is already the design. The schema is
relational with foreign keys, enums, generated columns, a security-invoker
view, GIN indexes on arrays and trigrams, and row-level security as the
authorization layer. No document store or cache is warranted: there is no hot
read path, no session store, no queue.

Tables: `profiles`, `ip_assets`, `conversations`, `conversation_reads`,
`messages`, `follows`, `listing_likes`, `saved_listings`,
`ip_office_records` (+ view `trademark_non_use_radar`).

Size today is trivially small. Even at "first 100 deals by hand" scale the
working set stays under a few hundred MB. Postgres 16 tuned for a small box
(`shared_buffers=256MB`, `work_mem=8MB`, `max_connections=40`) idles at
~150 MB RSS.

**Can it share a low-spec VPS with the app?** Yes, comfortably. Rough steady
state on one box:

| Process | RSS |
|---|---|
| Next.js standalone server (Node 24) | 250–400 MB |
| Postgres 16, small tuning | 150–250 MB |
| kamal-proxy (TLS, routing) | ~30 MB |
| Register MCP (HTTP mode) | ~80 MB |
| Backup agent, node exporter, log shipper | ~150 MB combined |

Roughly 1.0–1.2 GB. A 2 GB box runs it; a 4 GB box runs it with headroom for
`pg_trgm` similarity queries over a real register extract and for the
future embeddings slice. **Do not build the Next.js image on the VPS**: a
`next build` of this app wants 1.5–2 GB on its own. Build in CI, ship an
image.

### Three Supabase-specific storage couplings to unwind

1. **Object storage.** Three buckets (`listing-images`, `listing-docs`,
   `avatars`) used from two components. Replace with any S3-compatible
   store. Cloudflare R2 fits: 10 GB free, zero egress fees, custom domain for
   public URLs. Uploads move to presigned PUT URLs generated in a server
   action; public reads go via the R2 custom domain. Bucket-level policies
   from the migration become per-prefix rules in one bucket.
2. **Realtime.** Two subscribers (`message-thread.tsx`, `use-inbox-live.ts`)
   listen to Postgres Changes on `messages` through Supabase's realtime
   server. See §3 for the replacement.
3. **Auth-schema coupling.** 38 `auth.uid()` references across the 35 RLS
   policies, one FK to `auth.users`, and one `after insert on auth.users`
   trigger that creates the profile row. See §4 for the one-function fix
   that keeps every policy intact.

---

## 2. Computation & dependencies

### Runtime

| Component | Version | Notes |
|---|---|---|
| Node.js | 24 (CI and local); `engines` allows 20.19+, 22.13+, 24+ | Pin the container to the current LTS (24). |
| Next.js | 16.3 App Router | 23 pages, 1 route handler (`app/auth/callback`), 7 files with server actions. `next.config.ts` is empty. |
| React | 19.2 | |
| TypeScript | 5.9 | |
| Tailwind | 4.3 | Build-time only. |
| Data access | `@supabase/supabase-js` 2.108 via PostgREST | 43 importing files, 91 `.from()` call sites. This is the bulk of the migration work. |
| Validation | zod 4 | |
| Tests | Vitest 4, 19 files / 281 tests | Runs in ~65 s locally, dominated by jsdom setup. |

### Heavy work

There is none in the request path. No image processing, PDF generation,
encryption beyond TLS, queues, or cron in `package.json` or the code.

Two things to decide deliberately:

- **`next/image` optimisation.** Next runs `sharp` on the server for
  `next/image` in production. On a shared 2-core box that is the one CPU
  spike you would notice. Either install `sharp` and accept it, or set
  `images.unoptimized: true` and let R2 + Cloudflare serve the originals
  (listing images are user uploads with size limits already enforced by
  the bucket policy). The second is simpler and cheaper.
- **Ingestion.** Today the write path is a manually run script in fixture
  mode. When the live EUIPO feed is wired (`docs/INGESTION.md`, Activation
  1), it becomes the only background job. It is I/O-bound and bounded by
  design. Run it as a scheduled container on the host (Ofelia or a systemd
  timer invoking the app image with a script entrypoint). No queue needed.

### Baseline sizing

A 1-core / 2 GB VPS runs this app in production for the current user count.
It does not comfortably run it **plus** a control plane like Coolify (which
wants ~1 GB for itself) **plus** staging. Recommendation: **2 vCPU / 4 GB**
(Hetzner CX22 x86 ~€4.5/month, or CAX11 Arm ~€3.8/month; the whole stack is
Arm-clean, including Postgres and Node). That is the smallest tier where you
never think about memory.

---

## 3. Network & routing

### Routing shape

- Public marketing pages, then eight protected prefixes enforced in
  `lib/supabase/middleware.ts` via `proxy.ts` (`/dashboard`, `/messages`,
  `/listings`, `/network`, `/saved`, `/registries`, `/u`, `/onboarding`).
  With Clerk this logic moves to `clerkMiddleware()` with a route matcher;
  the prefix list is the only thing to carry over.
- One route handler (auth callback). Mutations are server actions. There is
  no separate API tier to route to, so **there is no case for a
  frontend/backend split across providers.** One origin, one process.
- No static-heavy paths worth an Nginx cache layer; Next serves its own
  `/_next/static` with immutable cache headers, and Cloudflare in front
  caches them at the edge for free.

Consequence: you do not need Traefik's dynamic discovery or Nginx's caching.
You need TLS termination, HTTP/2, and zero-downtime swaps between two app
containers. **kamal-proxy** (ships with Kamal 2) does exactly that with
automatic Let's Encrypt. If you later run several apps on the box, kamal-proxy
still routes by host header. Caddy is the equivalent if you deploy with plain
Compose instead.

### Long-lived connections

There are no WebSockets, SSE, or streaming responses in the app code today.
The two realtime subscriptions open a WebSocket from the browser to
Supabase's realtime service, not to the app. Leaving Supabase means choosing
a replacement:

| Option | Effort | Fit |
|---|---|---|
| **Server-Sent Events from a route handler, fed by Postgres `LISTEN/NOTIFY`** | ~1 day | Recommended. A trigger on `messages` insert does `pg_notify('messages', json)`. One `app/api/live/route.ts` (Node runtime, `ReadableStream`) holds a dedicated LISTEN connection and fans out to authenticated SSE clients filtered by conversation membership. kamal-proxy and Cloudflare both pass SSE through; set proxy read timeouts generously and send a heartbeat comment every 25 s. |
| Polling every 5 s | ~2 hours | Acceptable stopgap; the inbox and thread are the only consumers. |
| Self-hosted realtime server (Supabase Realtime, Soketi) | Days | Not justified for two subscribers. |

SSE keeps connection handling in Node, where a few hundred idle connections
cost nothing measurable. RLS still applies because the fan-out filter reuses
the same membership query as the pages.

### Edge

Put Cloudflare (free plan) in front: DNS, TLS to the edge, WAF managed rules,
static asset caching, bot fight mode, and the R2 public bucket domain. Origin
TLS stays on kamal-proxy so the box is never plain HTTP. Restrict the VPS
firewall to Cloudflare IP ranges on 443 plus your own IP on 22.

---

## 4. Auth: evaluating Clerk

### Fit

Clerk is a reasonable buy. Auth is the one component where owning the code
adds risk without adding much skill, and Clerk's Next.js App Router SDK is
mature: `clerkMiddleware()`, `auth()` in server components and actions,
passwordless email codes / magic links (which preserves the current
passwordless product decision), and organisations later if staff accounts
need roles. Free tier covers 10,000 MAU, then a flat monthly fee plus
per-MAU; verify current pricing. At the current stage the cost is zero.

Two honest caveats:

- It is a SaaS dependency in a plan whose theme is owning the stack. If
  that bothers you, Auth.js with a Postgres adapter and Resend for magic
  links is free and portable, at the price of doing your own session and
  token hygiene. Self-hosting GoTrue (Supabase's auth server) is the third
  path and keeps today's session model, but it is another stateful service
  to run and secure.
- Clerk owns the user table. The app keeps `profiles` keyed by Clerk's
  `user_id` (a string, not a UUID), created on Clerk's `user.created`
  webhook instead of the current database trigger on `auth.users`.

### Decouple auth from RLS with one function

This is the single most important design decision in the migration. Today
35 policies call `auth.uid()`, a Supabase function that reads the JWT
PostgREST attached to the session. Without PostgREST there is no JWT in the
session. Rather than rewriting the policies, introduce:

```sql
create schema if not exists app;

create function app.current_user_id() returns text
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')
$$;
```

and have the data layer run, per request, inside a transaction:

```sql
set local role app_user;                 -- non-superuser, RLS enforced
set local app.user_id = '<clerk user id>';
```

Then `sed 's/auth\.uid()/app.current_user_id()/'` over the migrations, and
every policy keeps its meaning. The connection pool holds one privileged
login; each request narrows itself with `set local`, which resets at
transaction end, so no bleed between requests. A `CHECK`-style sanity test in
CI asserts that a query without `app.user_id` set returns zero rows from
every RLS table.

Whichever provider you pick later, that function is the only seam to change.
Do this even if you stay with Clerk forever.

### Data-access layer

Replace `supabase-js` with a typed SQL builder over `pg`: **Drizzle** (schema
in TypeScript, generates types, `drizzle-kit` can introspect the existing
database) or **Kysely** (query-only, pairs with `kysely-codegen`). Either
handles the transaction-per-request pattern above cleanly. 91 call sites is
a week of mechanical work with tests as the safety net. Keep the migration
SQL hand-written in `supabase/migrations/` (rename the folder to
`db/migrations/`) and apply it with a plain runner (`node-pg-migrate`,
`dbmate`, or Drizzle's migrator) from the deploy pipeline.

---

## 5. VPS vs PaaS vs serverless for this codebase

| Criterion | Single VPS (Hetzner) | PaaS (Render, Fly, Railway) | Serverless (Vercel + Neon) |
|---|---|---|---|
| Fit to a stateless Next server + Postgres | Good | Good | Good (it is the current setup) |
| Cost at current scale | ~€5–10/mo all-in | $15–30/mo once Postgres is not on a free tier | $0–20/mo, jumps at Pro tiers |
| Cost at 10× scale | Same box or one size up | Scales linearly with dynos and DB tier | Function invocations + DB compute, hardest to predict |
| Postgres on the same machine | Yes, no network hop | No, managed add-on | No |
| SSE / long-lived connections | Native | Native on most | Awkward, execution limits |
| Backups and restore drills | Yours to build (the learning) | Provided, opaque | Provided, opaque |
| Ops burden | Patching, monitoring, on-call for one box | Low | Lowest |
| Lock-in | None: Docker + Postgres | Moderate | High (Vercel-specific features) |
| Devops skills exercised | IaC, containers, TLS, backups, observability | Dashboards | Almost none |

For this codebase, with no traffic pressure and an explicit learning goal,
the VPS wins on cost, control, and skill. The cost of that choice is that
uptime is now your responsibility. The checklist in §7 is how you pay it.

---

## 6. Recommended blueprint

```
                Cloudflare (DNS, TLS edge, WAF, static cache)  ──  R2 bucket (public custom domain)
                                │
                        Hetzner CX22 (Ubuntu 24.04 LTS, Docker)
                ┌───────────────┴────────────────────────────────────────┐
                │ kamal-proxy  :443  (Let's Encrypt, zero-downtime swap)  │
                │   ├── web        Next.js 16 standalone, Node 24          │
                │   ├── mcp        register MCP, Streamable HTTP + Clerk    │
                │   └── grafana-alloy / node-exporter (metrics, logs out)  │
                │ postgres:16  (docker volume; pgBackRest → R2, WAL + daily)│
                │ ofelia       (cron: ingestion pull, backup verify)        │
                └────────────────────────────────────────────────────────┘
                                │
      GitHub Actions: lint → test → build image → push GHCR → kamal deploy (staging, then prod)
      OpenTofu: Hetzner server + firewall + volume, Cloudflare DNS/R2, GitHub secrets
      Clerk (auth) · Resend (transactional email) · Grafana Cloud free (dashboards, alerts)
```

### Tooling, and why each

| Concern | Tool | Why this one |
|---|---|---|
| Infrastructure | **OpenTofu** with the Hetzner and Cloudflare providers | Whole environment reproducible from the repo; the staging box is the same module with a different variable. |
| Host config | cloud-init in the OpenTofu server resource (Docker install, ufw, unattended-upgrades, SSH hardening) | One file, no Ansible needed for one box. |
| Containers | Multi-stage `Dockerfile`, `output: "standalone"` in `next.config.ts`, non-root user, `node:24-alpine` | ~150 MB image, no build tools at runtime. |
| Deploy | **Kamal 2** | Zero-downtime deploys, health checks, rollbacks, accessories (Postgres) declared in one YAML, secrets pulled from a secret store at deploy time, no control plane running on the box. Teaches the mechanics rather than hiding them. |
| Alternative deploy | Coolify | If you want a UI. Needs the 4 GB tier, and it is one more service to keep patched. |
| Database | Postgres 16 container with a named volume; `app_user` role for the app, `register_reader` for the MCP, `migrator` for migrations | Least privilege per connection; RLS enforced because nothing runs as superuser. |
| Backups | **pgBackRest** (or wal-g) to R2: continuous WAL archiving + nightly full, 14-day retention; a weekly restore into a scratch container in CI with a row-count check | A backup you have not restored is a hypothesis. |
| Object storage | Cloudflare R2, one bucket, prefixes per former bucket, presigned uploads | Zero egress, free tier, S3 API. |
| Auth | Clerk via `@clerk/nextjs`; webhook to create/sync `profiles` | See §4. |
| Realtime | SSE route + `LISTEN/NOTIFY` | See §3. |
| Email | Resend | Magic-link mail is Clerk's; this is for notifications. Free tier is ample. |
| Observability | **Grafana Cloud free** (10k series, 50 GB logs) fed by Grafana Alloy on the host; Sentry free tier for app errors; **Uptime Kuma** on the box or Better Stack free for external checks | All free at this scale, all standard. |
| Alerts | Grafana alert rules → email/Slack: disk >80 %, backup age >26 h, 5xx rate, cert expiry, host down | The five things that actually page a one-person team. |
| Secrets | **sops + age**, encrypted files committed; Kamal's `.kamal/secrets` reads from them at deploy; production age key lives only in GitHub Actions secrets and your password manager | No plaintext secrets on laptops or in `.env.local` for production. Also retires the shared register MCP password: the MCP becomes an HTTP service behind Clerk. |
| CI | Existing `ci.yml` plus: image build and push, `kamal deploy -d staging` on main, manual approval gate to `production`, weekly restore drill job | Staging gets every merge; production is a button. |

### Environments

- **staging**: a second CX22 (or CX12) built from the same OpenTofu module,
  restored nightly from the production backup with PII masked (emails
  hashed). This is also your restore drill. ~€4/month.
- **production**: the CX22 above.
- **local**: `docker compose up` gives Postgres + the app; the same
  migrations run everywhere.

### Estimated monthly cost

| Item | € / month |
|---|---|
| Hetzner CX22 production | ~4.5 |
| Hetzner CX22 staging | ~4.5 |
| Hetzner snapshots / backups add-on | ~1 |
| Cloudflare DNS, WAF, R2 (free tiers) | 0 |
| Clerk, Resend, Grafana Cloud, Sentry (free tiers) | 0 |
| Domain | ~1 |
| **Total** | **~11** |

Versus today: Supabase Pro ($25) is needed for network restrictions and
point-in-time recovery; Vercel Pro ($20) for team features. The VPS path is
cheaper the moment you would have stepped off free tiers.

---

## 7. Definition of "hardened" — the checklist

Every line has a verification, and cutover is blocked until all pass.

### Reproducibility
- [ ] `tofu apply` from a clean checkout creates the server, firewall,
      volume, DNS records and R2 bucket. **Verify:** destroy and recreate
      staging.
- [ ] Host configuration lives entirely in cloud-init; no hand-run commands.
      **Verify:** the recreated staging box serves the app with no SSH
      session in between.
- [ ] `docker compose up` locally and `kamal deploy` remotely use the same
      image. **Verify:** image digest in the deploy log matches GHCR.

### Least privilege
- [ ] Nothing connects to Postgres as a superuser. Roles: `app_user` (RLS
      enforced, no `BYPASSRLS`), `migrator`, `register_reader`, `backup`.
      **Verify:** `select rolsuper, rolbypassrls from pg_roles` in CI.
- [ ] RLS coverage test: with `app.user_id` unset, every user table returns
      zero rows; with it set, the existing verify scripts pass. **Verify:**
      CI job against the staging database.
- [ ] Postgres and the MCP are not exposed on public interfaces; only 443
      (Cloudflare ranges) and 22 (your IP) are open. **Verify:** external
      `nmap` from CI.
- [ ] Containers run as non-root with read-only root filesystems where
      possible. **Verify:** `docker inspect` in the deploy check.

### Secrets
- [ ] No secret in git history, images, or `.env.local` for production.
      **Verify:** gitleaks in CI; `docker history` shows no env leakage.
- [ ] Every secret is rotatable in under 15 minutes with a documented
      runbook, and each has been rotated once as a drill. Includes Clerk
      keys, R2 keys, database roles, age key.

### Data safety
- [ ] Continuous WAL archiving plus nightly full backup to R2, 14-day
      retention, encrypted at rest. **Verify:** `pgbackrest info` shows a
      backup younger than 26 h; alert if not.
- [ ] Weekly automated restore into a scratch container with a row-count
      and checksum comparison. **Verify:** green job in Actions; you have
      read one restore log end to end.
- [ ] Recovery objectives written down: RPO ≤ 5 min (WAL), RTO ≤ 1 h
      (rebuild box + restore), and a rehearsed runbook that meets them.
- [ ] R2 bucket versioning on; object deletes are soft.

### Delivery
- [ ] Every merge to `main` deploys to staging automatically; production
      requires a manual approval in Actions. **Verify:** environment
      protection rule in GitHub.
- [ ] Deploys are zero-downtime and reversible: `kamal rollback` restores
      the previous image in under 2 minutes. **Verify:** do it once on
      staging under a load-test.
- [ ] Migrations run in the pipeline before the new image receives traffic,
      are forward-only, and are tested against a copy of production data
      on staging first.
- [ ] `npm test`, lint, typecheck, golden-set run (once `sn-2`/`sn-4`
      exist), gitleaks, and an image vulnerability scan (Trivy) gate the
      build.

### Observability
- [ ] Structured JSON logs from the app with request id and user id
      (hashed), shipped to Grafana Cloud; retention ≥ 14 days.
- [ ] Dashboards: request rate / latency / 5xx, Postgres connections and
      slow queries, disk, memory, backup age, certificate expiry.
- [ ] Alerts wired to a channel you read: host down, disk > 80 %, backup
      > 26 h old, 5xx > 1 % over 5 min, cert < 14 days. **Verify:** each
      alert fired once deliberately.
- [ ] External uptime check on `/` and on a signed-in health route.

### Application
- [ ] `app.current_user_id()` seam in place; no `auth.*` references remain.
- [ ] All 91 data-access sites on the typed SQL layer; `@supabase/*`
      removed from `package.json`.
- [ ] Uploads via presigned URLs with server-side size and MIME checks
      (mirroring the old bucket policies).
- [ ] SSE live updates working under kamal-proxy and Cloudflare, with
      heartbeat and reconnect.
- [ ] Register MCP served over Streamable HTTP behind Clerk, per-user
      identity in its logs; the shared `register_reader` password retired.
- [ ] Security headers (CSP, HSTS, frame-ancestors) set in `next.config.ts`
      and verified with an external scanner.

### Operations
- [ ] Runbooks in `docs/runbooks/`: deploy, rollback, restore, rotate
      secrets, scale up a tier, respond to disk-full, respond to cert
      failure.
- [ ] Unattended security updates on the host with a weekly reboot window;
      Docker and Postgres minor versions bumped by Dependabot-style PRs.
- [ ] Cost alert on the Hetzner and Cloudflare accounts.

---

## 8. Migration plan (time-boxed, parallel-run, one cutover)

Keep Supabase and Vercel running untouched until step 6. Nothing here is
user-visible until then.

| Step | Scope | Exit criterion |
|---|---|---|
| 1. Foundations (week 1) | OpenTofu for staging box, Cloudflare, R2; cloud-init; Dockerfile + standalone build; Kamal config; GHCR pipeline; Postgres accessory with pgBackRest | Hello-world Next image deploys to staging with TLS; a backup lands in R2 and restores. |
| 2. Auth seam (week 1–2) | `app.current_user_id()`, roles, `sed` the policies, migration runner; Clerk integration with webhook-created `profiles`; middleware port | Sign in on staging with Clerk; RLS coverage test green. |
| 3. Data layer (week 2–3) | Drizzle/Kysely; convert the 91 call sites feature by feature (listings → discovery → messaging → social → engagement), tests kept green throughout | `@supabase/*` gone; 281 tests pass; `verify-*.mjs` scripts ported and green on staging. |
| 4. Storage & realtime (week 3) | R2 presigned uploads; SSE + NOTIFY | Upload, avatar, and live inbox work on staging. |
| 5. Hardening pass (week 3–4) | Everything in §7 not yet ticked; alerts fired on purpose; runbooks written; production box created from the same module | Checklist complete on staging and production. |
| 6. Cutover | Freeze Supabase writes; `pg_dump` → restore into production Postgres; copy buckets to R2; export Clerk users from Supabase auth (email-only, passwordless makes this clean); DNS flip via Cloudflare; smoke test; keep Supabase read-only for 14 days as rollback | Users sign in and see their data; error rate flat for 48 h. |
| 7. Decommission | Delete Vercel project, downgrade/delete Supabase after the rollback window; rotate every credential once more | Cost report shows only the €11 line items. |

Three to four weeks part-time is realistic. If it overruns badly, cut scope
inside the plan (polling instead of SSE, skip staging-from-backup masking)
rather than stopping halfway with two stacks live.

---

## 9. What this changes for the sn-* sequence

- `sn-1` (invariants) and `sn-2` (golden set) are stack-independent; do
  `sn-1` before step 1 above so the target honours the invariants, and use
  `sn-2` as filler during the migration.
- `sn-3` onward (verdict persistence, back-test harness, hooks, v2 engine,
  monitoring) land on the new stack. Their tables use the same
  `app.current_user_id()` seam; their jobs use the same scheduled-container
  pattern as ingestion; their monitoring uses the Grafana stack already in
  place.
