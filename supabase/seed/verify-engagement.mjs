// Verify Slice D (engagement) against the real DB + app.
// Run:  node supabase/seed/verify-engagement.mjs
//   (expects the dev server on http://localhost:3000 for the HTTP smoke)
//
// Asserts:
//   - a member can like a listing they can see, and NOT as someone else;
//   - a guessed draft id cannot be liked through the action-visible path
//     (RLS visibility check) — verified at the query layer here;
//   - like reads are public to members; unlike removes only own rows;
//   - saved_counts() exposes aggregate counts WITHOUT exposing savers, and
//     is not callable anonymously;
//   - authed HTTP smoke: browse cards show like/save counts; the Saved
//     activity tab renders the viewer's likes/follows; Messages shows the
//     notifications panel for an owner whose listing was liked.
// Cleans up what it creates. Exits non-zero on any failure.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { TEST_PASSWORD } from "./seed.mjs";

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
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { client, userId: data.user.id, session: data.session };
}

// Titles render HTML-escaped (& -> &amp;); match what the browser receives.
function htmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ssrCookie(session) {
  const projectRef = new URL(url).hostname.split(".")[0];
  const payload = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  };
  const b64 =
    "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64url");
  const name = `sb-${projectRef}-auth-token`;
  if (b64.length < 3180) return `${name}=${b64}`;
  const mid = Math.ceil(b64.length / 2);
  return `${name}.0=${b64.slice(0, mid)}; ${name}.1=${b64.slice(mid)}`;
}

const cleanup = { likes: [] };

async function main() {
  const liker = await signIn("owner-c@spiralnexus.test");
  const owner = await signIn("owner-b@spiralnexus.test");
  cleanup.liker = liker;

  // A published listing owned by owner-b (so liking it notifies owner-b).
  const { data: target } = await liker.client
    .from("ip_assets")
    .select("id, title")
    .eq("owner_id", owner.userId)
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();
  if (!target) throw new Error("no published owner-b listing — run the seed");

  // ---- 1. Like writes -------------------------------------------------------
  const { error: likeErr } = await liker.client
    .from("listing_likes")
    .upsert(
      { user_id: liker.userId, listing_id: target.id },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    );
  check("member can like a visible listing", !likeErr, likeErr?.message);
  cleanup.likes.push({ user: liker, listingId: target.id });

  // Forging user_id must be blocked by the WITH CHECK.
  const { error: forgeErr } = await liker.client
    .from("listing_likes")
    .insert({ user_id: owner.userId, listing_id: target.id });
  check(
    "cannot like AS another member",
    !!forgeErr,
    forgeErr?.message ?? "insert accepted",
  );

  // A draft belonging to someone else is invisible through RLS, so the
  // visibility precheck the action does resolves to nothing.
  const { data: draft } = await owner.client
    .from("ip_assets")
    .select("id")
    .eq("owner_id", owner.userId)
    .eq("is_published", false)
    .limit(1)
    .maybeSingle();
  if (draft) {
    const { data: visible } = await liker.client
      .from("ip_assets")
      .select("id")
      .eq("id", draft.id)
      .maybeSingle();
    check("another member's draft is invisible (can't be liked)", !visible);
  }

  // ---- 2. Like reads + counts ----------------------------------------------
  const { data: likeRows } = await owner.client
    .from("listing_likes")
    .select("user_id")
    .eq("listing_id", target.id);
  check(
    "owner sees who liked their listing",
    (likeRows ?? []).some((r) => r.user_id === liker.userId),
  );

  // ---- 3. saved_counts: aggregate only, members only ------------------------
  const { data: savedCounts, error: scErr } = await liker.client.rpc(
    "saved_counts",
    { listing_ids: [target.id] },
  );
  check("saved_counts callable by member", !scErr, scErr?.message);
  const row = (savedCounts ?? [])[0];
  check(
    "saved_counts returns aggregate shape only",
    !row || (Object.keys(row).sort().join(",") === "listing_id,saves"),
    row ? Object.keys(row).join(",") : "no rows (0 saves)",
  );

  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: anonErr } = await anonClient.rpc("saved_counts", {
    listing_ids: [target.id],
  });
  check("saved_counts blocked for anon", !!anonErr, anonErr?.message ?? "allowed");

  // Cross-check: liker (not the saver) still can't read saved_listings rows.
  const { data: savedRows } = await liker.client
    .from("saved_listings")
    .select("user_id")
    .neq("user_id", liker.userId);
  check("individual saves stay private", (savedRows ?? []).length === 0);

  // ---- 4. Authed HTTP smoke --------------------------------------------------
  const likerCookie = ssrCookie(liker.session);
  const ownerCookie = ssrCookie(owner.session);

  const browse = await fetch("http://localhost:3000/listings", {
    headers: { Cookie: likerCookie },
  });
  const browseHtml = await browse.text();
  check("browse renders", browse.ok, `status ${browse.status}`);
  check(
    "cards render like buttons",
    browseHtml.includes('aria-label="Like listing"') ||
      browseHtml.includes('aria-label="Unlike listing"'),
  );
  check("cards render save counts", browseHtml.includes("saves"));

  const activity = await fetch("http://localhost:3000/saved?tab=activity", {
    headers: { Cookie: likerCookie },
  });
  const activityHtml = await activity.text();
  check("activity tab renders", activity.ok, `status ${activity.status}`);
  check(
    "activity shows the fresh like",
    activityHtml.includes("You liked") &&
      activityHtml.includes(htmlEscape(target.title)),
  );
  check("activity shows follows", activityHtml.includes("You followed"));

  const messages = await fetch("http://localhost:3000/messages", {
    headers: { Cookie: ownerCookie },
  });
  const messagesHtml = await messages.text();
  check("messages renders", messages.ok, `status ${messages.status}`);
  check(
    "owner sees like notification",
    messagesHtml.includes("Notifications") &&
      messagesHtml.includes(htmlEscape(target.title)),
  );

  const detail = await fetch(`http://localhost:3000/listings/${target.id}`, {
    headers: { Cookie: likerCookie },
  });
  const detailHtml = await detail.text();
  check(
    "detail shows saved-by count line",
    // RSC interleaves <!-- --> markers between interpolated text nodes.
    detail.ok && /Saved by (<!-- -->)?\s*\d+/.test(detailHtml),
    `status ${detail.status}`,
  );

  // ---- 5. Unlike (own-row delete) -------------------------------------------
  const { error: unlikeErr } = await liker.client
    .from("listing_likes")
    .delete()
    .eq("user_id", liker.userId)
    .eq("listing_id", target.id);
  check("member can remove their own like", !unlikeErr, unlikeErr?.message);
  cleanup.likes = [];

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
  return failures ? 1 : 0;
}

async function reap() {
  for (const l of cleanup.likes) {
    try {
      await l.user.client
        .from("listing_likes")
        .delete()
        .eq("user_id", l.user.userId)
        .eq("listing_id", l.listingId);
    } catch {
      // best-effort
    }
  }
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (e) {
  console.error("FATAL", e);
} finally {
  await reap();
}
process.exit(exitCode);
