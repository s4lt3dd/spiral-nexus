# Database migrations

Migrations in `supabase/migrations/` are the **source of truth** for the schema.
They are applied with the Supabase CLI (pinned in `devDependencies`), which
records each applied migration in the remote `supabase_migrations.schema_migrations`
table so local and remote stay in lockstep.

**Rules**
- Forward-only. Never edit a migration that has already been applied — add a new one.
- Every new table gets its RLS policies in the **same** migration. A table
  without RLS is a bug.
- Don't edit schema in the Supabase dashboard UI (it causes drift). If it
  happens, capture it with `npm run db:diff` into a new migration.

## One-time setup (per machine)

```bash
# 1. Link this repo to the remote project (needs a personal access token
#    SUPABASE_ACCESS_TOKEN and the database password).
npx supabase link --project-ref fsbpvnfxqgticxhkiqvs

# 2. Reconcile the migrations that were applied by hand via the SQL editor.
#    The remote tracking table doesn't know about them, so mark them applied
#    WITHOUT re-running their SQL (otherwise db push fails on existing objects):
npx supabase migration repair --status applied 0001 0002

# 3. Confirm both show as applied on local + remote:
npm run db:list
```

After this, `npm run db:push` is a no-op until a new migration exists.

## Day-to-day workflow

```bash
npm run db:new add_conversations   # creates supabase/migrations/<timestamp>_add_conversations.sql
#   ...write SQL + RLS in that file...
npm run db:push                    # applies only pending migrations to the linked project
node supabase/seed/verify-rls.mjs  # confirm RLS still holds (see seed/README.md)
```

`0001`/`0002` keep their numeric prefixes (renaming would break the repair
mapping). New migrations get timestamp prefixes from `db:new`; they sort after
the numeric ones and are collision-safe across contributors.

## Optional: local stack

Requires Docker. Lets you test migrations before touching the remote:

```bash
npx supabase start     # local Postgres + Studio
npm run db:reset       # rebuild the schema from all migrations
```

Note: seed data (`seed/seed.mjs`) depends on real auth users, so it's a separate
Node step rather than SQL run by `db:reset`. The local stack defaults to
Postgres `major_version = 17` in `config.toml` — set it to match the remote
project if you need exact parity.

## CI (later)

A GitHub Action on merge to `main` can run `supabase db push` using
`SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` repo secrets, keeping the
production schema in step with `main` automatically. Until that exists, run
`npm run db:push` manually as part of deploying.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:new -- <name>` | Create a new timestamped migration |
| `npm run db:push` | Apply pending migrations to the linked project |
| `npm run db:list` | Show applied/pending migrations (local vs remote) |
| `npm run db:reset` | Rebuild the local stack from all migrations |
| `npm run db:diff` | Generate a migration from detected schema drift |
| `npm run db:lint` | Lint the schema |
