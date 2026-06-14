// Verify messaging RLS against the real DB. Run AFTER applying the migration
// (`npm run db:push`) and seeding:  node supabase/seed/verify-messaging.mjs
//
// Uses real user sessions (anon key) so it exercises the exact policies the app
// relies on. A service-role client is used only to read a target listing and to
// clean up the test conversation. Exits non-zero on any failure.

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
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
function check(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function signIn(email) {
  const c = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await c.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { client: c, id: data.user.id };
}

async function main() {
  const a = await signIn(OWNERS[0].email); // owner-a — plays BUYER here
  const b = await signIn(OWNERS[1].email); // owner-b — plays OWNER
  const c = await signIn(OWNERS[2].email); // owner-c — outsider

  // A published listing owned by B (owner-b).
  const { data: listing } = await admin
    .from("ip_assets")
    .select("id")
    .eq("owner_id", b.id)
    .eq("is_published", true)
    .limit(1)
    .single();
  if (!listing) throw new Error("No published listing for owner-b — run the seed first.");

  // 1. Buyer (A) can start a conversation with owner (B).
  const { data: convo, error: convoErr } = await a.client
    .from("conversations")
    .insert({ listing_id: listing.id, buyer_id: a.id, owner_id: b.id })
    .select("id")
    .single();
  check("buyer can start a conversation", !!convo && !convoErr, convoErr?.message);
  const convoId = convo?.id;

  // 2. Buyer can post the first message.
  {
    const { error } = await a.client
      .from("messages")
      .insert({ conversation_id: convoId, sender_id: a.id, body: "Hi, interested." });
    check("buyer can post a message", !error, error?.message);
  }

  // 3. Owner (B) can read the conversation and reply.
  {
    const { data } = await b.client.from("conversations").select("id").eq("id", convoId);
    check("owner can read the conversation", data?.length === 1);
    const { error } = await b.client
      .from("messages")
      .insert({ conversation_id: convoId, sender_id: b.id, body: "Yes, available." });
    check("owner can reply", !error, error?.message);
  }

  // 4. Outsider (C) cannot read the conversation or its messages.
  {
    const { data: conv } = await c.client.from("conversations").select("id").eq("id", convoId);
    check("outsider cannot read conversation", conv?.length === 0, `got ${conv?.length}`);
    const { data: msgs } = await c.client.from("messages").select("id").eq("conversation_id", convoId);
    check("outsider cannot read messages", msgs?.length === 0, `got ${msgs?.length}`);
  }

  // 5. Outsider cannot post into it.
  {
    const { error } = await c.client
      .from("messages")
      .insert({ conversation_id: convoId, sender_id: c.id, body: "intruding" })
      .select("id");
    check("outsider cannot post a message", !!error, error ? "blocked" : "INSERT SUCCEEDED");
  }

  // 6. Sender spoofing is blocked (A posts as B).
  {
    const { error } = await a.client
      .from("messages")
      .insert({ conversation_id: convoId, sender_id: b.id, body: "spoofed" })
      .select("id");
    check("cannot spoof sender_id", !!error, error ? "blocked" : "SPOOF SUCCEEDED");
  }

  // 7. Self-contact is blocked (buyer_id == owner_id).
  {
    const { error } = await a.client
      .from("conversations")
      .insert({ listing_id: listing.id, buyer_id: a.id, owner_id: a.id })
      .select("id");
    check("cannot self-contact", !!error, error ? "blocked" : "SELF-CONTACT SUCCEEDED");
  }

  // 8. Cannot create a conversation on someone else's behalf (spoof buyer_id).
  {
    const { error } = await c.client
      .from("conversations")
      .insert({ listing_id: listing.id, buyer_id: a.id, owner_id: b.id })
      .select("id");
    check("cannot spoof buyer_id", !!error, error ? "blocked" : "SPOOF SUCCEEDED");
  }

  // Cleanup (service role; no delete policy exists for users).
  if (convoId) await admin.from("conversations").delete().eq("id", convoId);

  console.log(`\n${failures === 0 ? "ALL MESSAGING RLS CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-messaging error:", e.message ?? e);
  process.exit(1);
});
