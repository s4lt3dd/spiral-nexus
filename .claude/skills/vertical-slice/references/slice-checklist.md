# Slice Checklist

Copy this into the PR / task for each slice and tick as you go.

**Slice:** _one-sentence workflow this delivers_
**Out of scope:** _what this slice deliberately does NOT do_

- [ ] 1. Migration written in `supabase/migrations/` (only what this slice needs)
- [ ] 2. RLS policies for every new table, in the same migration
      - [ ] owner-only read/write where private
      - [ ] explicit, tightly-scoped public-read where needed
      - [ ] tier limits enforced server-side, not client-side
- [ ] 3. Types regenerated / updated in `lib/types.ts`
- [ ] 4. API route handler / server action, input validated (Zod), tier checks via `lib/tiers.ts`
- [ ] 5. UI built with shadcn/ui; loading, empty, and error states handled
- [ ] 6. Seed data added in `supabase/seed/` so it demos with realistic content
- [ ] 7. Test for the core path + ran end-to-end in the browser
      - [ ] verified RLS blocks cross-user access (tried to read another user's private row, it failed)
      - [ ] security pass if auth/RLS/payments touched
- [ ] Committed as a self-contained change
- [ ] Demoed before starting the next slice
