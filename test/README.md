# Tests

Unit tests run on **Vitest** (jsdom) with **React Testing Library**.

```bash
npm test        # single run, used by CI
npm run test:watch
```

Layout:

- `test/lib/**` — pure domain logic: tier capabilities, listing/price formatting,
  discovery + member search-param parsing, engagement aggregation, inbox
  assembly, and the Zod boundary schemas.
- `test/components/**` — component rendering, interaction, and conditional/empty
  states.
Vitest runs these as two projects (see `vitest.config.mts`):

| Project      | Files              | Environment                       |
| ------------ | ------------------ | --------------------------------- |
| `lib`        | `test/lib/**`      | `node` — no DOM, nothing to set up |
| `components` | `test/components/**` | `jsdom` + `test/setup.ts`        |

Keeping the pure-logic suite on `node` matters: building a jsdom per file
dominated startup and, on a cold `node_modules`, pushed the run past Vitest's
**fixed, non-configurable 60s worker-start timeout** — the whole run failed
before a single test executed.

The `components` project therefore also runs `isolate: false` on a single
worker, so jsdom is imported once instead of per file. **Consequence:** files in
that project share a module registry, so a `vi.mock` in one component test is
visible to the others. Today only `like-button.test.tsx` mocks anything, and
nothing else imports those modules. If you add a mock that another component
test also imports, give it an explicit per-test override rather than relying on
isolation.

- `test/helpers/supabase-mock.ts` — a chainable stand-in for the PostgREST query
  builder. It records the chain a loader builds and resolves to a canned result,
  so query *shape* can be asserted (e.g. browse only ever asks for published
  rows) without a database.

## What these tests deliberately do not cover

**Nothing here touches a real Supabase project or Postgres.** Server actions are
mocked at the module boundary and the query builder is faked.

That leaves one genuine gap:

> **TODO (integration): row-level security is untested.**
>
> RLS is enforced by Postgres, so it cannot be proven by a unit test — a mock
> that "returns the rows RLS would allow" only asserts what the mock was told to
> return, which is a fake pass, not a test. The policies that matter (a user
> only reads their own conversations; drafts are hidden from everyone but their
> owner; `listing_saves` is readable only through the aggregate-only
> `saved_counts` SECURITY DEFINER function) need an integration suite running
> against `supabase db reset` with real signed-in clients.
>
> Until that exists, `test/lib/discovery.test.ts` and `test/lib/members.test.ts`
> assert the *application-level* filters that sit in front of RLS
> (`is_published`, `onboarded_at`, the public column list) — defence in depth,
> not a substitute.

Storage uploads, Stripe, and the auth callback are likewise integration
concerns and are not simulated here.
