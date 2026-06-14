// Verify ip_assets RLS actually blocks cross-user access against the real DB.
// Run AFTER seed.mjs:  node supabase/seed/verify-rls.mjs
//
// Uses the ANON key + real user sessions (never the service role), so it
// exercises the exact policies the app relies on. Exits non-zero on any failure.

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

async function main() {
  const a = await signIn(OWNERS[0].email);
  const b = await signIn(OWNERS[1].email);
  const anonClient = userClient();

  // Owner B's rows (as B, who can see all of their own).
  const { data: bAll } = await b.from("ip_assets").select("*").order("title");
  const bDraft = bAll.find((r) => !r.is_published);
  const bPublished = bAll.find((r) => r.is_published);

  // 1. A cannot READ B's draft.
  {
    const { data } = await a.from("ip_assets").select("id").eq("id", bDraft.id);
    check("A cannot read B's draft", data.length === 0, `got ${data.length} rows`);
  }

  // 2. A cannot UPDATE B's published row (RLS update filter -> 0 rows affected).
  {
    const { data } = await a
      .from("ip_assets")
      .update({ title: "HIJACKED" })
      .eq("id", bPublished.id)
      .select("id");
    check("A cannot update B's listing", data.length === 0, `affected ${data.length}`);
  }

  // 3. A cannot DELETE B's row.
  {
    const { data } = await a
      .from("ip_assets")
      .delete()
      .eq("id", bPublished.id)
      .select("id");
    check("A cannot delete B's listing", data.length === 0, `deleted ${data.length}`);
    // Confirm it still exists from B's side.
    const { data: still } = await b.from("ip_assets").select("id").eq("id", bPublished.id);
    check("B's listing survived A's delete attempt", still.length === 1);
  }

  // 4. A CAN read B's *published* listing (the marketplace must work).
  {
    const { data } = await a.from("ip_assets").select("id").eq("id", bPublished.id);
    check("A can read B's published listing", data.length === 1);
  }

  // 5. Anonymous sees only published rows, never drafts.
  {
    const { data: pub } = await anonClient.from("ip_assets").select("id,is_published");
    const anyDraft = pub.some((r) => r.is_published === false);
    check("anon sees no drafts", !anyDraft, `${pub.length} rows visible`);
    const { data: drafts } = await anonClient
      .from("ip_assets")
      .select("id")
      .eq("is_published", false);
    check("anon draft query returns nothing", drafts.length === 0, `got ${drafts.length}`);
  }

  // 6. Owner happy path: A can create, update, and delete their OWN listing.
  {
    const {
      data: { user: aUser },
    } = await a.auth.getUser();
    const { data: created } = await a
      .from("ip_assets")
      .insert({
        owner_id: aUser.id,
        title: "TEMP MARK",
        type: "trademark",
        source: "user_submitted",
        deal_type: "license",
      })
      .select("id")
      .single();
    check("A can create own listing", !!created?.id);

    if (created?.id) {
      const { data: upd } = await a
        .from("ip_assets")
        .update({ title: "TEMP MARK v2", is_published: true })
        .eq("id", created.id)
        .select("id");
      check("A can update own listing", upd.length === 1);

      const { data: del } = await a
        .from("ip_assets")
        .delete()
        .eq("id", created.id)
        .select("id");
      check("A can delete own listing", del.length === 1);
    }
  }

  console.log(`\n${failures === 0 ? "ALL RLS CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-rls error:", e.message ?? e);
  process.exit(1);
});
