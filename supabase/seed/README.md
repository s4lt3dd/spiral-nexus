# Seed data

Seed listings depend on real auth users (RLS ties `ip_assets.owner_id` to a
profile, which mirrors `auth.users`). Because of that, seeding meaningful demo
listings is done in the Listings slice, once we can create a test user and
attach published trademarks to it. Placeholder for now.
