// Verify profile RLS + column-level GRANTs against the real DB.
// Run AFTER seed.mjs:  node supabase/seed/verify-profiles.mjs
//
// Uses the ANON key + real user sessions (never the service role), so it
// exercises the exact policies + grants the app relies on:
//   - a user cannot edit another user's profile (RLS),
//   - a user cannot self-verify or self-upgrade their tier (column GRANT),
//   - private columns (stripe_customer_id) are not selectable (column GRANT),
//   - public columns incl. subscription_tier ARE selectable (cap/dashboard read),
//   - a user can edit their own editable fields + stamp onboarded_at,
//   - completeness matches the lib/profile.ts definition on seed data.
// Exits non-zero on any failure.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { OWNERS, TEST_PASSWORD } from "./seed.mjs";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PUBLIC_COLS =
  "id, display_name, org_name, role_flags, subscription_tier, verified, headline, bio, avatar_url, website, linkedin_url, location, country, sectors, nice_class_interests, jurisdictions, onboarded_at, created_at";

let failures = 0;
function check(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

function userClient() {
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email) {
  const c = userClient();
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

// Mirror of profileCompleteness() in lib/profile.ts (8 weighted checks).
function completeness(p) {
  const has = (v) => !!v && String(v).trim().length > 0;
  const hasAny = (v) => Array.isArray(v) && v.length > 0;
  const checks = [
    has(p.display_name),
    has(p.headline),
    has(p.bio),
    has(p.avatar_url),
    has(p.location),
    hasAny(p.role_flags),
    hasAny(p.sectors),
    hasAny(p.jurisdictions),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

async function main() {
  const a = await signIn(OWNERS[0].email);
  const b = await signIn(OWNERS[1].email);
  const anonClient = userClient();

  const {
    data: { user: aUser },
  } = await a.auth.getUser();
  const {
    data: { user: bUser },
  } = await b.auth.getUser();

  // 1. A cannot UPDATE B's profile (RLS update filter -> 0 rows affected).
  {
    const { data } = await a
      .from("profiles")
      .update({ headline: "HIJACKED" })
      .eq("id", bUser.id)
      .select("id");
    check("A cannot edit B's profile", (data?.length ?? 0) === 0, `affected ${data?.length ?? 0}`);
    const { data: still } = await b.from("profiles").select("headline").eq("id", bUser.id).single();
    check("B's headline survived A's edit", still.headline !== "HIJACKED", still.headline);
  }

  // 2. A cannot self-VERIFY (verified is not in the UPDATE grant).
  {
    const { error } = await a
      .from("profiles")
      .update({ verified: true })
      .eq("id", aUser.id);
    check("A cannot set verified on self", !!error, error ? "blocked" : "NO ERROR");
    const { data } = await a.from("profiles").select("verified").eq("id", aUser.id).single();
    check("A's verified is unchanged", data.verified === (OWNERS[0].verified ?? false));
  }

  // 3. A cannot self-UPGRADE tier (subscription_tier is not in the UPDATE grant).
  {
    const { error } = await a
      .from("profiles")
      .update({ subscription_tier: "enterprise" })
      .eq("id", aUser.id);
    check("A cannot change own subscription_tier", !!error, error ? "blocked" : "NO ERROR");
    const { data } = await a
      .from("profiles")
      .select("subscription_tier")
      .eq("id", aUser.id)
      .single();
    check("A's tier is still entry", data.subscription_tier === "entry", data.subscription_tier);
  }

  // 4. Private column stripe_customer_id is not selectable (column GRANT).
  {
    const { error } = await a.from("profiles").select("stripe_customer_id").eq("id", aUser.id);
    check("stripe_customer_id is not selectable", !!error, error ? "blocked" : "NO ERROR");
    const { error: anonErr } = await anonClient.from("profiles").select("stripe_customer_id").limit(1);
    check("anon cannot select stripe_customer_id", !!anonErr, anonErr ? "blocked" : "NO ERROR");
  }

  // 5. Public columns (incl. subscription_tier — cap/dashboard read) ARE selectable.
  {
    const { data, error } = await anonClient.from("profiles").select(PUBLIC_COLS).limit(1);
    check("public columns are selectable by anon", !error && (data?.length ?? 0) >= 0, error?.message ?? "");
    // The dashboard + listing-cap path reads the user's own tier.
    const { data: tier, error: tErr } = await a
      .from("profiles")
      .select("subscription_tier")
      .eq("id", aUser.id)
      .single();
    check("authenticated can read own subscription_tier", !tErr && !!tier, tErr?.message ?? tier?.subscription_tier);
  }

  // 6. A CAN edit own editable fields + stamp onboarded_at (the action's path).
  {
    const { data, error } = await a
      .from("profiles")
      .update({ headline: OWNERS[0].headline, onboarded_at: new Date().toISOString() })
      .eq("id", aUser.id)
      .select("id");
    check("A can edit own profile + onboarded_at", !error && data?.length === 1, error?.message ?? `affected ${data?.length}`);
  }

  // 7. Completeness matches lib/profile.ts on seed data (A full, B lighter).
  {
    const { data: ap } = await a.from("profiles").select(PUBLIC_COLS).eq("id", aUser.id).single();
    const { data: bp } = await b.from("profiles").select(PUBLIC_COLS).eq("id", bUser.id).single();
    check("Owner A profile is 100% complete", completeness(ap) === 100, `${completeness(ap)}%`);
    check("Owner B profile is partial (< 100%)", completeness(bp) < 100, `${completeness(bp)}%`);
  }

  console.log(`\n${failures === 0 ? "ALL PROFILE CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-profiles error:", e.message ?? e);
  process.exit(1);
});
