# Data inventory

> **Draft — pending legal review.** Maps every table that holds personal data,
> why we hold it, and how it is removed on account deletion. This is also the
> spec for the data export / delete-account feature (Slice 6b).

All application tables live in Supabase Postgres with Row-Level Security. The
authoritative schema is `supabase/migrations/`.

| Table | Personal data | Purpose | On account deletion |
|---|---|---|---|
| `auth.users` | email, auth metadata | Authentication | **Deleted** (the delete root) |
| `profiles` | name, org, headline, bio, location, links, avatar, roles, sectors, jurisdictions, class interests | Public identity + directory | Cascade from `auth.users` |
| `ip_assets` | listing content authored by the user | Marketplace listings | Cascade from `profiles` (`owner_id`) |
| `conversations` | participant ids, timestamps | 1:1 messaging threads | Cascade from `profiles` (`buyer_id`/`owner_id`) |
| `messages` | message body, sender | Message content | Cascade from `conversations` and from `profiles` (`sender_id`) |
| `saved_listings` | which listings a user saved | Bookmarks | Cascade from `profiles` (`user_id`) |
| `follows` | follow edges | Social graph | Cascade from `profiles` (follower/following) |

## Deletion model
- Every table references `profiles` (or `auth.users`) with `ON DELETE CASCADE`,
  and `profiles.id` references `auth.users.id` with `ON DELETE CASCADE`.
- Therefore deleting the **`auth.users`** row removes all of the user's data in
  one operation. Slice 6b performs this via a server-only service-role call,
  scoped strictly to `auth.uid()` (a user can only delete themselves).
- **Shared conversations:** because `conversations` cascade on either
  participant, deleting a user also removes the thread for the other party. This
  is intentional for the MVP (no orphaned one-sided threads).

## Export model
- A user can export their own data (profile, listings, conversations + messages,
  saved listings, follows) as JSON, read through their own RLS-scoped session so
  the export only ever contains the caller's data.

## Retention
- Personal data is retained while the account is active and deleted on account
  deletion (immediate cascade), subject to any legal-hold obligations.
- Billing data is out of scope until Stripe ships; revisit retention then.
