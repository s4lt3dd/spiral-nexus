// Verify the data export / delete-account model (Slice 6b) against the real DB.
// Run:  node supabase/seed/verify-account.mjs
//
// Safety: this is a DESTRUCTIVE test, so it operates on TWO dedicated throwaway
// users it creates and destroys itself — it never touches demo/seed data.
//
// Asserts:
//   - a normal (anon-key) session CANNOT delete another user's data, nor any
//     profiles row, even with a crafted id (RLS — the "no crafted id" guarantee);
//   - deleting the auth user (the action's only path, scoped to auth.uid())
//     cascades and removes ALL their rows across every table;
//   - the other user's non-shared data survives (shared conversations are
//     intentionally removed for both parties);
//   - demo data is untouched.
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
function check(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

const T1 = "account-delete-probe-1@spiralnexus.test";
const T2 = "account-delete-probe-2@spiralnexus.test";

async function findId(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data.users.find((u) => u.email === email)?.id ?? null;
}

async function ensureFreshUser(email) {
  const existing = await findId(email);
  if (existing) await admin.auth.admin.deleteUser(existing);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function countAll(table, filter) {
  let q = admin.from(table).select("*", { count: "exact", head: true });
  q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

async function main() {
  // Fresh throwaway users.
  const id1 = await ensureFreshUser(T1);
  const id2 = await ensureFreshUser(T2);
  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await anonClient.auth.signInWithPassword({ email: T1, password: TEST_PASSWORD });

  // Seed user 1 with a row in every table (as service role).
  const { data: l1 } = await admin
    .from("ip_assets")
    .insert({ owner_id: id1, title: "PROBE-ONE", type: "trademark", source: "user_submitted", deal_type: "license", is_published: true })
    .select("id")
    .single();
  const { data: l2 } = await admin
    .from("ip_assets")
    .insert({ owner_id: id2, title: "PROBE-TWO", type: "trademark", source: "user_submitted", deal_type: "license", is_published: true })
    .select("id")
    .single();
  await admin.from("saved_listings").insert({ user_id: id1, listing_id: l2.id });
  await admin.from("follows").insert({ follower_id: id1, following_id: id2 });
  const { data: convo } = await admin
    .from("conversations")
    .insert({ listing_id: l2.id, buyer_id: id1, owner_id: id2 })
    .select("id")
    .single();
  await admin.from("messages").insert({ conversation_id: convo.id, sender_id: id1, body: "probe message" });

  check("user 1 has a listing", (await countAll("ip_assets", (q) => q.eq("owner_id", id1))) === 1);
  check("user 1 has a saved listing", (await countAll("saved_listings", (q) => q.eq("user_id", id1))) === 1);
  check("user 1 has a follow", (await countAll("follows", (q) => q.eq("follower_id", id1))) === 1);
  check("user 1 has a sent message", (await countAll("messages", (q) => q.eq("sender_id", id1))) === 1);

  // --- RLS guards: a normal session can't delete others' data or any profile.
  {
    const { data: a } = await anonClient.from("saved_listings").delete().eq("user_id", id2).select("user_id");
    check("cannot delete another user's saves (crafted id)", (a?.length ?? 0) === 0);
    const { data: b } = await anonClient.from("ip_assets").delete().eq("id", l2.id).select("id");
    check("cannot delete another user's listing (crafted id)", (b?.length ?? 0) === 0);
    const { data: c } = await anonClient.from("profiles").delete().eq("id", id2).select("id");
    check("cannot delete another user's profile", (c?.length ?? 0) === 0);
    const { data: d } = await anonClient.from("profiles").delete().eq("id", id1).select("id");
    check("cannot delete even own profile via client (only cascade)", (d?.length ?? 0) === 0);
  }

  // --- The action's delete path: service-role deleteUser scoped to the user.
  const { error: delErr } = await admin.auth.admin.deleteUser(id1);
  check("account deleted via service role", !delErr, delErr?.message);

  // --- Cascade wiped ALL of user 1's data.
  check("profile gone", (await countAll("profiles", (q) => q.eq("id", id1))) === 0);
  check("listings gone", (await countAll("ip_assets", (q) => q.eq("owner_id", id1))) === 0);
  check("saved gone", (await countAll("saved_listings", (q) => q.eq("user_id", id1))) === 0);
  check("follows gone", (await countAll("follows", (q) => q.eq("follower_id", id1))) === 0);
  check("messages gone", (await countAll("messages", (q) => q.eq("sender_id", id1))) === 0);
  check(
    "conversations gone",
    (await countAll("conversations", (q) => q.or(`buyer_id.eq.${id1},owner_id.eq.${id1}`))) === 0,
  );

  // --- Other user's non-shared data survives; shared convo removed (intended).
  check("other user's profile intact", (await countAll("profiles", (q) => q.eq("id", id2))) === 1);
  check("other user's listing intact", (await countAll("ip_assets", (q) => q.eq("owner_id", id2))) === 1);

  // --- Demo data untouched.
  check("demo user still exists", (await findId(OWNERS[0].email)) !== null);

  // Cleanup the second throwaway user.
  await admin.auth.admin.deleteUser(id2);

  console.log(`\n${failures === 0 ? "ALL ACCOUNT CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-account error:", e.message ?? e);
  process.exit(1);
});
