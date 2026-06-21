// Verify realtime messaging authorization against the real DB. Run AFTER applying
// the migration (`npm run db:push`) and seeding:
//   node supabase/seed/verify-realtime.mjs
//
// The crux of Slice 9: a user must only RECEIVE realtime messages from
// conversations they participate in. With Postgres Changes, Realtime evaluates
// the `messages` SELECT RLS policy against each subscriber's JWT before delivery,
// so the existing participant-only policy is the realtime authorization boundary.
//
// This proves it end to end: a participant subscribed to a conversation receives
// a new message, while a NON-PARTICIPANT — subscribed BOTH with a conversation
// filter AND fully unfiltered to the whole messages table — receives nothing.
//
// Uses real user sessions (anon key) so it exercises the exact policies the app
// relies on. Service role is used only to read a listing and to clean up.
// Requires a global WebSocket (Node >= 22). Exits non-zero on any failure.

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

if (typeof WebSocket === "undefined") {
  console.error(
    "verify-realtime needs a global WebSocket — run on Node >= 22 (see package.json engines).",
  );
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  // Hand the verified JWT to the realtime socket so RLS is evaluated as this user.
  c.realtime.setAuth(data.session.access_token);
  return { client: c, id: data.user.id };
}

// Subscribe to message INSERTs, collecting received rows. `filter` is the optional
// Postgres Changes row filter (omit it for a fully-unfiltered, whole-table listen).
function subscribe(client, name, filter) {
  const received = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`channel "${name}" never subscribed`)),
      10000,
    );
    const binding = {
      event: "INSERT",
      schema: "public",
      table: "messages",
      ...(filter ? { filter } : {}),
    };
    const channel = client
      .channel(name)
      .on("postgres_changes", binding, (payload) => received.push(payload.new))
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve({ channel, received });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(err || new Error(`channel "${name}": ${status}`));
        }
      });
  });
}

async function main() {
  const a = await signIn(OWNERS[0].email); // participant — BUYER
  const b = await signIn(OWNERS[1].email); // participant — OWNER
  const c = await signIn(OWNERS[2].email); // outsider

  // A published listing owned by B.
  const { data: listing } = await admin
    .from("ip_assets")
    .select("id")
    .eq("owner_id", b.id)
    .eq("is_published", true)
    .limit(1)
    .single();
  if (!listing) throw new Error("No published listing for owner-b — run the seed first.");

  // Fresh A<->B conversation (drop any leftover from a prior run first).
  await admin
    .from("conversations")
    .delete()
    .eq("listing_id", listing.id)
    .eq("buyer_id", a.id);
  const { data: convo, error: convoErr } = await admin
    .from("conversations")
    .insert({ listing_id: listing.id, buyer_id: a.id, owner_id: b.id })
    .select("id")
    .single();
  if (convoErr || !convo) throw new Error(`create conversation: ${convoErr?.message}`);
  const convoId = convo.id;

  // Three live subscriptions:
  //  - participant A, filtered to this conversation (should receive)
  //  - outsider C, filtered to this conversation (should receive nothing)
  //  - outsider C, UNFILTERED across the whole messages table (should receive nothing)
  const filter = `conversation_id=eq.${convoId}`;
  let aSub, cFilteredSub, cAllSub;
  try {
    [aSub, cFilteredSub, cAllSub] = await Promise.all([
      subscribe(a.client, `a-thread:${convoId}`, filter),
      subscribe(c.client, `c-thread:${convoId}`, filter),
      subscribe(c.client, "c-all-messages", undefined),
    ]);
  } catch (e) {
    check("all channels subscribed", false, e.message);
    await admin.from("conversations").delete().eq("id", convoId);
    process.exit(1);
  }

  // Let the postgres_changes bindings finish registering server-side. The
  // SUBSCRIBED callback can fire just before the filter is live, and Postgres
  // Changes does not replay — an INSERT in that gap is missed by everyone, so we
  // settle first to make the test deterministic.
  await sleep(2500);

  // Owner B (a participant) posts a reply.
  const marker = `realtime-check ${convoId}`;
  const { data: posted, error: postErr } = await b.client
    .from("messages")
    .insert({ conversation_id: convoId, sender_id: b.id, body: marker })
    .select("id")
    .single();
  check("participant can post a message", !!posted && !postErr, postErr?.message);
  const msgId = posted?.id;

  // Wait for the participant to receive (poll up to 5s), then give the outsider
  // an equal extra window to (not) receive before asserting.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && !aSub.received.some((m) => m.id === msgId)) {
    await sleep(150);
  }
  await sleep(1500);

  check(
    "participant receives the realtime message",
    aSub.received.some((m) => m.id === msgId),
    `received ${aSub.received.length}`,
  );
  check(
    "outsider (filtered) receives nothing",
    !cFilteredSub.received.some((m) => m.id === msgId),
    `received ${cFilteredSub.received.length}`,
  );
  check(
    "outsider (unfiltered, whole table) receives nothing",
    !cAllSub.received.some((m) => m.id === msgId),
    `received ${cAllSub.received.length}`,
  );

  // Cleanup.
  for (const s of [aSub, cFilteredSub, cAllSub]) {
    if (s?.channel) await s.channel.unsubscribe();
  }
  await admin.from("conversations").delete().eq("id", convoId);

  console.log(
    `\n${failures === 0 ? "ALL REALTIME CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-realtime error:", e.message ?? e);
  process.exit(1);
});
