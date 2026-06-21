// Verify saved_listings RLS against the real DB.
// Run AFTER seed.mjs:  node supabase/seed/verify-saved.mjs
//
// Uses the ANON key + real user sessions (never the service role), so it
// exercises the exact policies the save feature relies on:
//   - a user can save then unsave their own,
//   - a user cannot read another user's saves,
//   - a user cannot insert a save as another user,
//   - the composite PK rejects a duplicate save (idempotency backstop).
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

  // A published listing owned by B — visible to A (used as the save target).
  const { data: bPublished } = await b
    .from("ip_assets")
    .select("id")
    .eq("owner_id", bUser.id)
    .eq("is_published", true)
    .limit(1)
    .single();
  const target = bPublished.id;

  // Clean slate for A's save of this listing.
  await a.from("saved_listings").delete().eq("user_id", aUser.id).eq("listing_id", target);

  // 1. A can save their own bookmark.
  {
    const { error } = await a
      .from("saved_listings")
      .insert({ user_id: aUser.id, listing_id: target });
    check("A can save a listing", !error, error?.message);
    const { data } = await a
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", aUser.id)
      .eq("listing_id", target);
    check("A's save is readable by A", (data?.length ?? 0) === 1);
  }

  // 2. Duplicate save is rejected by the composite PK (idempotency backstop).
  {
    const { error } = await a
      .from("saved_listings")
      .insert({ user_id: aUser.id, listing_id: target });
    check("duplicate save rejected by PK", !!error, error?.code ?? "no error");
  }

  // 3. B cannot read A's saves (RLS select scoped to own rows).
  {
    const { data } = await b
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", aUser.id);
    check("B cannot read A's saves", (data?.length ?? 0) === 0, `got ${data?.length ?? 0}`);
  }

  // 4. B cannot insert a save AS A (RLS with-check on user_id).
  {
    const { error } = await b
      .from("saved_listings")
      .insert({ user_id: aUser.id, listing_id: target });
    check("B cannot insert a save as A", !!error, error ? "blocked" : "NO ERROR");
  }

  // 5. A can unsave their own.
  {
    const { data } = await a
      .from("saved_listings")
      .delete()
      .eq("user_id", aUser.id)
      .eq("listing_id", target)
      .select("listing_id");
    check("A can unsave", (data?.length ?? 0) === 1);
  }

  console.log(`\n${failures === 0 ? "ALL SAVED CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-saved error:", e.message ?? e);
  process.exit(1);
});
