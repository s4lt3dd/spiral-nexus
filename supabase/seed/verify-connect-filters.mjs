// Verify Slice C (Connect filters) against the real DB + app.
// Run:  node supabase/seed/verify-connect-filters.mjs
//   (expects the dev server on http://localhost:3000 for the HTTP smoke)
//
// Asserts:
//   - profiles.country is readable via the public column grant and editable
//     ONLY on the user's own row (RLS + column grant);
//   - a user cannot flip verified via the same update path (grant intact);
//   - multi-sector overlaps query matches members in ANY selected sector;
//   - country eq filter matches;
//   - authed HTTP smoke: /network renders with sectors= and country= params.
// Exits non-zero on any failure.

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

async function main() {
  const me = await signIn("owner-b@spiralnexus.test");
  const other = await signIn("owner-c@spiralnexus.test");

  // ---- 1. country column: readable + own-row editable ----------------------
  const { data: mine, error: readErr } = await me.client
    .from("profiles")
    .select("id, country")
    .eq("id", me.userId)
    .single();
  check("country column readable via grant", !readErr, readErr?.message);
  const before = mine?.country ?? null;

  const { error: updErr } = await me.client
    .from("profiles")
    .update({ country: "Ireland" })
    .eq("id", me.userId);
  check("user can update own country", !updErr, updErr?.message);

  // Cross-user update: RLS row policy must block (0 rows), never error.
  const { data: crossRows } = await me.client
    .from("profiles")
    .update({ country: "France" })
    .eq("id", other.userId)
    .select("id");
  check("cannot update ANOTHER member's country", (crossRows ?? []).length === 0);

  // verified must stay locked (column grant unchanged by this migration).
  const { error: verErr } = await me.client
    .from("profiles")
    .update({ verified: true })
    .eq("id", me.userId);
  check("verified still not self-editable", !!verErr, verErr?.message ?? "accepted");

  // restore
  await me.client.from("profiles").update({ country: before }).eq("id", me.userId);

  // ---- 2. Directory queries -------------------------------------------------
  // Multi-sector overlaps: Fashion & Apparel OR Financial Services should
  // match both Eli Marsh (fashion) and Dana Reed (financial) seed members.
  const { data: multi } = await me.client
    .from("profiles")
    .select("display_name, sectors")
    .not("onboarded_at", "is", null)
    .overlaps("sectors", ["Fashion & Apparel", "Financial Services"]);
  const names = (multi ?? []).map((r) => r.display_name);
  check(
    "overlaps matches ANY selected sector",
    names.includes("Eli Marsh") && names.includes("Dana Reed"),
    names.join(", "),
  );

  const { data: fr } = await me.client
    .from("profiles")
    .select("display_name")
    .eq("country", "France");
  check(
    "country filter matches",
    (fr ?? []).some((r) => r.display_name === "Farah Niu"),
    (fr ?? []).map((r) => r.display_name).join(", "),
  );

  // ---- 3. Authed HTTP smoke ---------------------------------------------------
  const cookie = ssrCookie(me.session);
  const qs = `sectors=${encodeURIComponent("Fashion & Apparel,Financial Services")}`;
  const res = await fetch(`http://localhost:3000/network?${qs}`, {
    headers: { Cookie: cookie },
  });
  const html = await res.text();
  check("network renders multi-sector filter", res.ok, `status ${res.status}`);
  check("multi-sector results include Eli Marsh", html.includes("Eli Marsh"));
  check("multi-sector results include Dana Reed", html.includes("Dana Reed"));
  check(
    "sector chips render",
    html.includes("Fashion &amp; Apparel") && html.includes("Financial Services"),
  );

  const resFr = await fetch(
    `http://localhost:3000/network?country=${encodeURIComponent("France")}`,
    { headers: { Cookie: cookie } },
  );
  const htmlFr = await resFr.text();
  check("network renders country filter", resFr.ok, `status ${resFr.status}`);
  check("country=France matches Farah Niu", htmlFr.includes("Farah Niu"));
  check(
    "country=France excludes UK members",
    !htmlFr.includes("Greg Hollis"),
  );

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
