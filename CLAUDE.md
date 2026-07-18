# Spiral Nexus

Two-sided marketplace for intellectual property assets (trademarks first for
MVP, patents later). Owners list assets to license/sell; buyers and licensees
discover them and make contact.

**Copy rule (founder decision, July 2026):** user-facing copy never says
"marketplace" — say **hub** (product/brand contexts) or **platform** (legal
pages). "Marketplace" stays only in internal docs like this one.

**Core loop to protect:** owner lists an asset -> buyer finds it -> buyer
contacts the owner.

## Skills (read these first)
- `.claude/skills/spiral-nexus-architecture` - stack, structure, data model,
  tiers, RLS/security rules. The source of truth. Consult before writing code.
- `.claude/skills/vertical-slice` - how to build a feature end-to-end
  (schema -> RLS -> types -> API -> UI -> seed -> test). Use for every feature.
- `.claude/skills/ui-ux-pro-max` - design intelligence (styles, palettes,
  font pairings, UX/accessibility rules, shadcn/Next.js stack data). Use for
  ALL UI/UX work: new components, pages, styling, and design reviews.

Full product spec: `docs/MVP-SPEC.md`.

## Design / UI quality (non-negotiable)
This product is sold to businesses; the UI must look **premium and
authoritative** (Stripe/Linear-grade) - polished AND distinctive, never bare,
sterile, or generic "AI-slop". Restraint alone reads as boring; aim for
*intentional richness*: a real brand identity, deliberate depth (layered
shadows, elevation), confident large display type, signature components, and
motion.

**Source of truth: `design-system/spiral-nexus/MASTER.md`** - read it before
ANY UI work and build to its tokens (palette, type, spacing, shadows, motion,
component specs). Page-specific overrides live in
`design-system/spiral-nexus/pages/[page].md`. Use `.claude/skills/ui-ux-pro-max`
for deeper UX/accessibility guidance, but the MASTER file wins on visual
identity. Build on shadcn/ui primitives, but theme them via the tokens - never
ship the default shadcn look. The brand is **purple with gradients** (emerald
is retired) and **dark mode is THE theme** (founder decision, July 2026):
every surface, marketing and app, ships dark - no light mode, no toggle.
Official logo assets live in `public/brand/` (logo plum `#551D67`; white mark
in-app). Avoid the anti-patterns listed in MASTER.md (pure-black canvas,
borderless cards on dark, glow overload, timid type, emoji headings,
flat/cheap gradients, lifeless empty states).

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
`/auth/callback`. Sign out is client-side from the account menu in the shared
`components/marketing/site-header.tsx` (browser client `auth.signOut()`), which
is the single auth-aware nav used across marketing and app surfaces. Protected
prefixes are listed in `lib/supabase/middleware.ts`.

## Database
Migrations in `supabase/migrations/`. After creating a Supabase project,
generate types: `npx supabase gen types typescr