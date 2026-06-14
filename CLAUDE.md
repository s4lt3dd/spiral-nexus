# Spiral Nexus

Two-sided marketplace for intellectual property assets (trademarks first for
MVP, patents later). Owners list assets to license/sell; buyers and licensees
discover them and make contact.

**Core loop to protect:** owner lists an asset -> buyer finds it -> buyer
contacts the owner.

## Skills (read these first)
- `.claude/skills/spiral-nexus-architecture` - stack, structure, data model,
  tiers, RLS/security rules. The source of truth. Consult before writing code.
- `.claude/skills/vertical-slice` - how to build a feature end-to-end
  (schema -> RLS -> types -> API -> UI -> seed -> test). Use for every feature.

Full product spec: `docs/MVP-SPEC.md`.

## Stack
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · Supabase
(Postgres/Auth/Storage/RLS) · Stripe (later) · Vercel. Keep it lean; ask before
adding dependencies outside this set.

## Conventions
- Server Supabase client: `lib/supabase/server.ts`. Browser: `lib/supabase/client.ts`.
- Session refresh + route guards: `proxy.ts` + `lib/supabase/middleware.ts`.
- Tier capabilities: `lib/tiers.ts` - read from here, never hardcode tier names.
- Every new table gets RLS policies in the SAME migration. No exceptions.
- Enforce tier limits server-side; the UI is never the security boundary.
- Secrets in env vars only (see `.env.example`); never expose the service-role
  key or Stripe secret to the browser.
- Validate API input with Zod. Commit per slice.

## MVP slice order
0. Skeleton: auth + empty dashboard + deploy. (DONE)
1. Listings CRUD (trademark).
2. Discovery: browse, detail, search/filter.
3. Contact / 1:1 messaging.
4. Subscriptions (Stripe) gating list count + DM limits.
Post-MVP (do NOT build into the foundation): AI matchmaking, IP-office data
ingestion, social feed, analytics, verification automation.

## Auth
Passwordless magic-link (Supabase OTP). Login at `/login`, code exchanged at
`/auth/callback`, sign out via POST `/auth/signout`. Protected prefixes are
listed in `lib/supabase/middleware.ts`.

## Database
Migrations in `supabase/migrations/`. After creating a Supabase project,
generate types: `npx supabase gen types typescript --project-id <id> > lib/database.types.ts`.
