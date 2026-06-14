---
name: vertical-slice
description: The standard workflow for building one complete feature in the Spiral Nexus codebase (or any Next.js + Supabase + Stripe app) end-to-end. Use this skill whenever the task is to add or build a feature, "slice", page, or capability - for example listings CRUD, search, messaging, dashboard, subscriptions, or any new user-facing workflow. Trigger it even if the user just says "build the listings feature" or "add messaging" without naming a slice. It enforces that every feature ships as a full vertical slice (database -> security -> API -> UI -> seed -> test) instead of half-wired layers, and keeps each feature shaped the same way.
---

# Vertical Slice Workflow

A "slice" is one user-facing workflow built all the way through the stack so it actually works, end to end, before moving on. The reason to work this way: building horizontal layers (a whole schema, then a whole API, then a whole UI) leaves you with weeks of work and nothing demoable, and integration problems surface late. A slice produces a working, demoable feature every time, and surfaces integration issues immediately.

This skill is for the Spiral Nexus stack (Next.js App Router + TypeScript + Supabase + Stripe + Tailwind/shadcn). For project specifics - data model, tiers, folder structure - also consult the `spiral-nexus-architecture` skill; this skill is the *process*, that one is the *facts*.

## Before you start

Confirm three things with the user (briefly - infer where you can):

1. **What is the one workflow this slice delivers?** State it as a user sentence: "an owner can create and publish a trademark listing." If you can't say it in one sentence, the slice is too big - split it.
2. **What's explicitly out of this slice?** Name the things you are deliberately not doing yet, so scope doesn't creep mid-build.
3. **What does "done" look like?** Usually: the workflow works in the browser against the real database, with security enforced and seed data to demo it.

Don't start coding a slice that's secretly three slices. If it has multiple independent workflows, propose splitting it and let the user pick the first.

## The seven steps, in order

Build in this sequence. Each step depends on the one before, so doing them out of order causes rework.

### 1. Schema (migration)

Write a SQL migration in `supabase/migrations/` adding only the tables/columns this slice needs. Follow the data model in the architecture skill - reuse existing tables rather than duplicating. Use clear column names, sensible types, foreign keys, and `created_at` defaults.

### 2. Security (RLS) - in the same migration

Add Row-Level Security policies for every new table in the same migration. This is not optional and not a later step: a table without RLS is a security bug. The defaults:

- Owners read/write only their own rows (`owner_id = auth.uid()`).
- Publicly visible data (e.g. published listings) gets an explicit public-read policy, scoped as tightly as possible (`is_published = true`).
- Tier limits (listing caps, weekly DM caps) are enforced server-side - in the route handler or a Postgres trigger/policy - never trusted from the client.

Think through who can see and do what *before* writing the API, because the API is allowed to assume RLS is the backstop.

### 3. Types

Regenerate or update the shared types (`lib/types.ts`) from the new schema so the rest of the slice is type-safe. Don't hand-maintain types that can be generated from Supabase.

### 4. API / server logic

Add the route handlers or server actions for this workflow. Validate input at the boundary (Zod or equivalent) - never trust the client payload. Use the server Supabase client for privileged work; keep the service-role key server-side only. Enforce any tier capability here by reading from `lib/tiers.ts`, not by hardcoding tier names.

### 5. UI

Build the screens using shadcn/ui primitives and Tailwind, placed in the right folder per the architecture skill (`app/(app)/...` for authenticated surfaces). Wire the UI to the API. Handle the unglamorous states: loading, empty, and error. The UI hides controls a user can't use, but remember hiding a button is UX, not security - the database is the security boundary.

### 6. Seed data

Add or extend seed data in `supabase/seed/` so the feature can be demoed with realistic content. A marketplace feature shown against an empty database demos badly and hides bugs. Seed enough rows to make search, pagination, and list states meaningful.

### 7. Test and verify

Write at least a basic test for the core path, then actually run the slice in the browser end-to-end and confirm the one-sentence workflow works. For anything touching auth, RLS, or payments, do a security pass (the `security-review` command is good for this). Confirm RLS actually blocks cross-user access - try to read another user's private row and verify it fails.

## Definition of done

A slice is done when: the migration applies cleanly, RLS is in place and verified, the workflow works in the browser against real data, seed data makes it demoable, a test covers the core path, and it's committed as a self-contained change. Then demo it to the user/founders before starting the next slice.

## Anti-patterns to avoid

- Building the schema for five future features "while you're in there." Build only what this slice needs.
- Adding a table without RLS and planning to "secure it later."
- Enforcing tier limits only in the UI.
- Skipping seed data and demoing against an empty DB.
- Bundling multiple workflows into one slice so nothing is demoable until all of it is done.

See `references/slice-checklist.md` for a copy-pasteable checklist to track a slice through these steps.
