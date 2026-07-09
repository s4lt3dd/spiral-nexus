// Verify the Connect / member directory query against the real DB.
// Run AFTER seed.mjs:  node supabase/seed/verify-network.mjs
//
// Uses the ANON key + a real user session (never the service role), so it
// exercises the exact RLS + column GRANTs the /network page relies on. Mirrors
// the searchMembers() query in lib/members.ts. Exits non-zero on any failure.

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

async function signIn(email) {
  const c = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

// Base directory query: onboarded members, excluding the caller (mirrors
// searchMembers in lib/members.ts).
function directory(client, selfId) {
  return client
    .from("profiles")
    .select(PUBLIC_COLS, { count: "exact" })
    .not("onboarded_at", "is", null)
    .neq("id", selfId);
}

async function main() {
  const a = await signIn(OWNERS[0].email);
  const {
    data: { user: self },
  } = await a.auth.getUser();

  // 1. Directory lists more than one member.
  {
    const { data, count, error } = await directory(a, self.id);
    check("directory lists multiple members", !error && (count ?? 0) > 1, `count ${count}`);
    check("caller is excluded from results", !(data ?? []).some((r) => r.id === self.id));
  }

  // 2. role=investor returns only members whose role_flags include investor.
  {
    const { data, error } = await directory(a, self.id).contains("role_flags", ["investor"]);
    const ok = !error && data.length > 0 && data.every((r) => r.role_flags.includes("investor"));
    check("role filter (investor) is correct", ok, `${data?.length ?? 0} rows`);
  }

  // 3. sector filter returns only members in that sector.
  {
    const sector = "Beauty & Cosmetics";
    const { data, error } = await directory(a, self.id).contains("sectors", [sector]);
    const ok = !error && data.length > 0 && data.every((r) => r.sectors.includes(sector));
    check("sector filter is correct", ok, `${data?.length ?? 0} rows for ${sector}`);
  }

  // 4. keyword search matches name/headline/org.
  {
    const like = "*Dana*";
    const { data, error } = await directory(a, self.id).or(
      `display_name.ilike.${like},headline.ilike.${like},org_name.ilike.${like}`,
    );
    const ok = !error && data.some((r) => (r.display_name ?? "").includes("Dana"));
    check("keyword search finds a member by name", ok, `${data?.length ?? 0} rows`);
  }

  // 5. Regression: a directory read cannot select stripe_customer_id.
  {
    const { error } = await a
      .from("profiles")
      .select("id, stripe_customer_id")
      .not("onboarded_at", "is", null)
      .limit(1);
    check("stripe_customer_id not selectable in directory", !!error, error ? "blocked" : "NO ERROR");
  }

  console.log(`\n${failures === 0 ? "ALL NETWORK CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-network error:", e.message ?? e);
  process.exit(1);
});
