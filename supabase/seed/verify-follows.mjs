// Verify follows RLS + constraints against the real DB.
// Run AFTER seed.mjs:  node supabase/seed/verify-follows.mjs
//
// Uses the ANON key + real user sessions (never the service role), so it
// exercises the exact policies/constraints the follow feature relies on:
//   - a user can follow then unfollow another,
//   - a user cannot follow themselves (CHECK),
//   - a user cannot insert a follow as someone else (RLS),
//   - a duplicate follow is a no-op via upsert (idempotency),
//   - follower/following counts read back correctly.
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

async function main() {
  const a = await signIn(OWNERS[0].email);
  const b = await signIn(OWNERS[1].email);
  const {
    data: { user: aUser },
  } = await a.auth.getUser();
  const {
    data: { user: bUser },
  } = await b.auth.getUser();

  // Clean slate for A→B.
  await a.from("follows").delete().eq("follower_id", aUser.id).eq("following_id", bUser.id);

  // 1. A can follow B.
  {
    const { error } = await a
      .from("follows")
      .insert({ follower_id: aUser.id, following_id: bUser.id });
    check("A can follow B", !error, error?.message);
  }

  // 2. A cannot follow themselves (no_self_follow CHECK).
  {
    const { error } = await a
      .from("follows")
      .insert({ follower_id: aUser.id, following_id: aUser.id });
    check("A cannot follow self", !!error, error?.code ?? "no error");
  }

  // 3. B cannot insert a follow AS A (RLS with-check on follower_id).
  {
    const { error } = await b
      .from("follows")
      .insert({ follower_id: aUser.id, following_id: bUser.id });
    check("B cannot follow as A", !!error, error ? "blocked" : "NO ERROR");
  }

  // 4. Duplicate follow via upsert(ignoreDuplicates) is a no-op (no error).
  {
    const { error } = await a
      .from("follows")
      .upsert(
        { follower_id: aUser.id, following_id: bUser.id },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true },
      );
    check("duplicate follow is a no-op", !error, error?.message ?? "ok");
    const { count } = await a
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", aUser.id)
      .eq("following_id", bUser.id);
    check("still exactly one edge after duplicate", count === 1, `count ${count}`);
  }

  // 5. Counts read back: B has >= 1 follower (A); A follows >= 1 (B).
  {
    const { count: bFollowers } = await a
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", bUser.id);
    check("B's follower count includes A", (bFollowers ?? 0) >= 1, `followers ${bFollowers}`);
    const { count: aFollowing } = await a
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", aUser.id);
    check("A's following count includes B", (aFollowing ?? 0) >= 1, `following ${aFollowing}`);
  }

  // 6. A can unfollow B.
  {
    const { data } = await a
      .from("follows")
      .delete()
      .eq("follower_id", aUser.id)
      .eq("following_id", bUser.id)
      .select("follower_id");
    check("A can unfollow B", (data?.length ?? 0) === 1);
  }

  console.log(`\n${failures === 0 ? "ALL FOLLOW CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-follows error:", e.message ?? e);
  process.exit(1);
});
