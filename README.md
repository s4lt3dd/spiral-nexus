# Spiral Nexus

AI-powered marketplace to list, discover, and commercialise intellectual
property assets (trademarks first, patents later).

## Stack
Next.js (App Router, TS) · Tailwind · Supabase (Postgres/Auth/RLS) · Stripe
(later) · Vercel.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project at https://supabase.com, then copy
   `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project
     Settings -> API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only - keep secret)
3. Apply the database schema: run `supabase/migrations/0001_init.sql` in the
   Supabase SQL editor (or via the Supabase CLI).
4. Run the app:
   ```bash
   npm run dev
   ```

## Project layout
- `app/(marketing)` - public pages (home, about, subscriptions)
- `app/(auth)` - login
- `app/(app)` - authenticated surface (dashboard; listings/messages to come)
- `lib/` - Supabase clients, tier definitions, shared types
- `supabase/migrations` - database schema (source of truth)
- `docs/MVP-SPEC.md` - product spec and build plan
- `.claude/skills/` - project skills (architecture + vertical-slice workflow)

## How this project is built
Features ship as complete vertical slices. See `.claude/skills/vertical-slice`.
