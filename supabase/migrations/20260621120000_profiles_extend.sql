-- Slice 4: extend profiles with public-facing identity + interests, and lock
-- down billing columns with column-level GRANTs. RLS stays intact (rows are
-- world-readable; users edit only their own).

alter table public.profiles
  add column headline text,
  add column bio text,
  add column avatar_url text,
  add column website text,
  add column linkedin_url text,
  add column location text,
  add column sectors text[] not null default '{}',
  add column nice_class_interests int[] not null default '{}',
  add column jurisdictions text[] not null default '{}',
  add column onboarded_at timestamptz;

-- Intent vocabulary is owner | buyer | licensee | investor. role_flags already
-- exists (default '{buyer}'); the allowed set is enforced in the Zod boundary,
-- and updateProfile never lets a user touch verified / subscription_tier /
-- stripe_customer_id (no self-verify, no self-upgrade).

-- Column privacy ------------------------------------------------------------
-- profiles rows are world-readable (the SELECT policy is `using (true)`), but
-- RLS is row-level and cannot hide columns. Revoke the table-wide SELECT and
-- re-grant only the public columns so stripe_customer_id is never exposed to
-- anon/authenticated. subscription_tier STAYS granted: the authenticated
-- client reads the user's own tier for the listing cap + dashboard. Billing
-- fields move to a dedicated owner-only table when Stripe lands at Launch.
revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  display_name,
  org_name,
  role_flags,
  subscription_tier,
  verified,
  headline,
  bio,
  avatar_url,
  website,
  linkedin_url,
  location,
  sectors,
  nice_class_interests,
  jurisdictions,
  onboarded_at,
  created_at
) on public.profiles to anon, authenticated;

-- No self-verify / no self-upgrade ------------------------------------------
-- The RLS update policy lets a user update their OWN row, and that's by design
-- for editing a profile. But RLS can't restrict WHICH columns change, so a
-- user could otherwise hit PostgREST directly and flip verified=true or change
-- their tier. Lock UPDATE to the editable columns via a column-level GRANT;
-- verified / subscription_tier / stripe_customer_id / id / created_at are
-- intentionally excluded and can only be changed by the service role.
revoke update on public.profiles from anon, authenticated;

grant update (
  display_name,
  org_name,
  headline,
  bio,
  avatar_url,
  website,
  linkedin_url,
  location,
  role_flags,
  sectors,
  nice_class_interests,
  jurisdictions,
  onboarded_at
) on public.profiles to authenticated;
