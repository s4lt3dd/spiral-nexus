# Spiral Nexus — MVP Spec & Build Plan

*Reverse-engineered from the Softr mockup (previewportal.softr.app), June 2026. This is a working draft to refine with the founders.*

---

## 1. What Spiral Nexus is

An AI-powered, centralised marketplace and networking hub for **intellectual property (IP) assets** — patents and trademarks. Two sides of the market:

- **Supply:** IP owners (inventors, SMEs, law firms) list intangible assets to license or sell.
- **Demand:** Businesses, investors, and licensees ("Brand Partners") discover assets and connect with owners.

The pitch is "don't let IP sit unused" — turn dormant patents/trademarks into licensing and sale opportunities, with AI matchmaking and a social/networking layer on top.

## 2. What the mockup actually contains today

The Softr preview is a **marketing shell**, not a working product. Four public routes plus a login-gated stub:

| Route | Title | What's there |
|---|---|---|
| `/` | Home | Hero, value prop, 3 testimonials, CTAs (About / Subscribe / Join Us) |
| `/about` | About | Positioning copy, "Join Us" CTA |
| `/subscriptions` | Subscriptions | 4 pricing tiers (below) |
| `/network` | Connect | Gated "Feed" stub — "Share your vision / Collaborate" — no real feed yet |
| `/login` | — | Redirects to Home (auth not wired) |

**Everything the product actually does is implied by the pricing page and copy, but not built.** That's your scope.

### Pricing tiers (the feature map in disguise)

The tiers tell you exactly which features the founders expect to exist:

- **Entry (£0):** Basic browsing, access to user-submitted listings, access to IP-office data worldwide.
- **Professional (£99/mo):** List up to 5 IP assets, AI matchmaking, limited DMs (5/wk), enhanced search/filter, verified badge, seller analytics dashboard, unlimited social.
- **Brand Partner (£99/mo):** Full access to all listings, license-only filtering + prioritised results, limited DMs (5/wk), verified badge, unlimited social.
- **Enterprise (£249/mo):** Unlimited listings, full brand-partner access, unlimited DMs/social, full AI matchmaking, market intelligence/trend data, verified badges, advanced analytics.

So the real feature set is: **listings (user + IP-office sourced), search/filter, AI matchmaking, direct messaging, a social feed, verification, seller analytics, and tiered subscriptions/paywalls.**

## 3. User roles

1. **IP Owner / Seller** — lists assets, manages listings, receives matches and DMs, sees seller analytics.
2. **Buyer / Investor** — browses, searches, gets matched, messages owners.
3. **Brand Partner / Licensee** — same as buyer but license-focused filtering and prioritised results.
4. **Admin** — moderates listings, manages users/verification, handles reports. (Not in mockup; you'll need it.)

Most users are both buyer and seller, so treat "role" as a set of capabilities gated by subscription tier rather than a single fixed type.

## 4. Proposed data model

Core entities (Postgres / Supabase). Fields are a starting point — confirm with founders.

- **users** — id, email, name, org_name, role_flags, subscription_tier, verified (bool), created_at, stripe_customer_id.
- **ip_assets (listings)** — id, owner_id, type (patent | trademark), title, abstract/description, jurisdiction, registration_number, status (registered | pending | granted), filing_date, ipc/nice_class, deal_type (license | sale | both), asking_price, source (user_submitted | ip_office), external_ref, images, created_at, is_published.
- **ip_office_records** — cached/imported records from public IP registries (separate from user listings so you don't conflate owned vs. referenced data).
- **matches** — id, asset_id, user_id, score, reason, status (suggested | viewed | dismissed), created_at. (AI matchmaking output.)
- **conversations** / **messages** — standard DM model; enforce weekly DM limits per tier.
- **posts** / **feed_items** — social feed content; comments, likes.
- **subscriptions** — user_id, tier, status, period_end, stripe_subscription_id.
- **saved_searches / watchlist** — user_id, criteria or asset_id.
- **reports / moderation** — for admin.

The patent/trademark split matters: trademarks use Nice classes + brand/logo data; patents use IPC classes + claims/abstract. Either model them as one table with a type flag and nullable type-specific fields, or two tables with a shared view. Ask the founders which dominates v1.

## 5. MVP cut line

The hard part is **not** building everything the pricing page promises. The smallest thing that proves the core value loop: *an owner can list an IP asset, a buyer can find it and contact the owner.* Everything else is a later slice.

**In for MVP:**

1. Auth + user profiles with role/tier.
2. Create / edit / publish an IP listing (start with one type — likely trademarks, often simpler data).
3. Browse + search + filter listings.
4. Listing detail page + "contact owner" / basic 1:1 messaging.
5. Subscriptions/paywall scaffolding (Stripe) gating list-count and messaging.

**Parked (v1.1+):** AI matchmaking, automated IP-office data ingestion, the social feed, seller analytics dashboard, verified-badge workflow, market-intelligence/trend data, advanced filtering.

Two features look central but are the biggest traps — descope them deliberately for the first demo:

- **IP-office data ingestion** (EPO/USPTO/UKIPO/WIPO/EUIPO APIs) is a whole project on its own. For MVP, seed a sample dataset manually or stub a single registry.
- **"AI matchmaking"** can be a simple keyword/embedding similarity over listings to start — not a model you train. Make it a thin slice, not the foundation.

## 6. Recommended stack

For a solo-built, ownable MVP:

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** — front end + API routes.
- **Supabase** — Postgres, auth, storage, row-level security. Covers most of the gated/tiered access cleanly.
- **Stripe** — subscriptions and tier gating.
- **Vercel** — hosting/CI.
- **For matchmaking later:** pgvector in the same Postgres + an embedding API — no separate infra.

This is deliberately boring and fast. I can scaffold nearly all of it and write the migrations, components, and Stripe wiring.

## 7. Build order (vertical slices)

Each slice ships end-to-end (schema → API → UI → working in browser), demoed to founders before the next.

1. **Slice 0 — Skeleton:** repo, Next.js app, Supabase project, auth, deploy to Vercel. A logged-in user sees an empty dashboard.
2. **Slice 1 — Listings CRUD:** create/edit/publish a trademark listing; owner sees their listings.
3. **Slice 2 — Discovery:** public/browse grid, listing detail page, basic search + filter.
4. **Slice 3 — Contact/messaging:** buyer contacts owner; minimal 1:1 inbox.
5. **Slice 4 — Subscriptions:** Stripe tiers; gate list-count and DM limits.
6. **Slice 5+ (post-MVP):** matchmaking (embeddings), IP-office import, social feed, analytics, verification.

## 8. How to use Claude through this

- Give me this spec as the source of truth. Run `init` in the repo to generate a CLAUDE.md so I stay consistent across sessions.
- Work slice by slice: I scaffold schema + API + UI for a slice, you run it, paste errors back, I fix. Commit per slice.
- Let me write the migrations, seed data, and tests so demos don't break.
- Use `review` / `security-review` on changes before merging — IP/marketplace data and payments make security non-trivial.
- Keep all secrets in env vars (Supabase keys, Stripe keys); I'll set up the pattern and never hardcode them.

## 9. Questions for the founders (plain-English, ready to send)

These are written to be asked of non-technical founders — framed as business decisions, not data or engineering ones. Each has *why it matters* and *my lean* so they can react to a recommendation rather than start from a blank page.

**1. Which type of IP do we lead with?**
"To get a strong first version out fast, I want to build deeply for one type of IP and add the other right after. Based on who you think our earliest users really are — patent/technology owners, or brand/trademark owners — which should the first version be built around?"
*Why it matters:* building both at once roughly doubles the work and makes both feel generic; picking one gives us a focused, polished launch.
*My lean:* trademarks/brand licensing — your pricing already has a "Brand Partner" tier built around licensees, which is a brand concept.

**2. What's the one moment the product has to nail?**
"When you show this to your first real user, what's the single thing it has to do flawlessly — the moment that makes them say 'I need this'?"
*Why it matters:* that becomes the first thing we build and the thing we protect from scope creep.
*My lean:* an owner lists an asset, a buyer finds it and contacts them. Simple, complete, demonstrable.

**3. Do we need official government IP data at launch?**
"Can we launch with only listings our own users post? Or is the platform not credible until it also pulls in IP from official government registries (USPTO, UKIPO, etc.)?"
*Why it matters:* pulling in registry data is a large separate build *and* each registry has its own terms about reusing their data — it would push the timeline out significantly.
*My lean:* launch with user-submitted listings only; add registry data later once the product is proven.

**4. Do we handle the deal, or just the introduction?**
"When two parties connect, does Spiral Nexus simply introduce them and they sort out the licensing/sale themselves — or do we handle the actual deal: contracts, payments, taking a cut?"
*Why it matters:* "just introductions" is light and fast. "Handling the deal" means contracts, money movement, and real legal/compliance work — a much bigger product.
*My lean:* introductions only for MVP; revisit transactions once there's deal volume.

**5. What does the "verified" badge actually require?**
"The pricing promises a verified badge. What does a user have to do to earn it, and who checks — your team manually, uploading documents, or matching against an official registry?"
*Why it matters:* it's the difference between a quick automated feature and an ongoing manual review process your team has to staff.
*My lean:* manual review by your team for MVP; automate later.

**6. Where are we launching, and does money or sensitive data flow on day one?**
"Are we UK-first to start? And at launch, does any user payment or sensitive personal data flow that we need to be careful about legally?"
*Why it matters:* the answer shapes privacy handling (GDPR applies regardless) and whether we need identity checks. Your pricing is in £, so I've assumed UK-first.
*My lean:* UK-first, privacy-by-default, no money movement in v1 beyond subscriptions.

**7. Do paywalls need to work at launch, or do we go free first?**
"At launch, do the paid tiers need to actually take payment — or do we want a free, usable product first to get listings onto the platform, and switch on payments once there's something worth paying for?"
*Why it matters:* a marketplace is worthless empty. Charging on day one can starve us of the early listings that make it useful.
*My lean:* free first to solve the cold-start; turn on payments once supply and demand exist.

**8. What are you happy to *not* have in version one?**
"I'll push to keep the first version small. It really helps to hear you say out loud what can wait until later."
*Why it matters:* getting an explicit "these can wait" list prevents mid-build scope creep and protects the launch date.
*My lean:* park AI matchmaking, the social feed, analytics dashboards, registry data, and verification automation for after launch.

## 10. Domain notes / risks

- **Cold-start / two-sided market:** the platform is useless empty. Decide early whether you seed supply (import/curate listings) or demand first. This affects whether IP-office ingestion is actually MVP-critical despite the scope.
- **Data provenance:** keep user-submitted listings strictly separate from IP-office records; never let users claim ownership of assets they don't own without verification.
- **Legal surface:** IP licensing touches contract law; be clear in v1 whether you're a marketplace (introductions only) or a transaction platform (much heavier).
- **"AI" expectation management:** the brand leans on AI; start with simple, explainable similarity matching and label it honestly rather than overpromising a model you can't yet support.

---

*Next step: confirm the answers to §9 with the founders, then I can scaffold Slice 0 and Slice 1.*
