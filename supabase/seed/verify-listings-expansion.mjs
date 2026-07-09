// Verify Slice B (listings expansion) against the real DB + Storage + app.
// Run:  node supabase/seed/verify-listings-expansion.mjs
//   (expects the dev server on http://localhost:3000 for the HTTP smoke)
//
// Asserts:
//   - a signed-in owner can create a listing with the full expanded data set
//     (multi Nice classes, currency, territory, filing date, license terms,
//     encumbrances, quality control) through RLS;
//   - CHECK constraints reject bad rows (invalid currency, Nice class > 45);
//   - the browse filter matches listings by Nice-class containment;
//   - Storage RLS: owners upload only into their OWN folder in both buckets;
//     anon clients can't read listing-docs; listing-images public URLs serve;
//   - authed HTTP smoke: browse + detail render the expanded fields.
// Cleans up everything it creates. Exits non-zero on any failure.

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

const OWNER = "owner-b@spiralnexus.test";
const OTHER = "owner-c@spiralnexus.test";

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

// Cleanup state — populated as the run creates things, reaped in `finally`
// so a crash (e.g. dev server down) never strands probe data in the shared DB.
const cleanup = { probeId: null, owner: null, ownPath: null, docPath: null };

async function main() {
  const owner = await signIn(OWNER);
  const other = await signIn(OTHER);
  cleanup.owner = owner;

  // ---- 1. Full expanded insert through RLS -------------------------------
  const { data: created, error: insErr } = await owner.client
    .from("ip_assets")
    .insert({
      owner_id: owner.userId,
      type: "trademark",
      source: "user_submitted",
      title: "VERIFY-EXPANSION",
      description: "Probe listing for the Slice B verify script.",
      jurisdiction: "UKIPO — United Kingdom",
      registration_number: "UK00009999901",
      status: "registered",
      nice_classes: [9, 42],
      deal_type: "license",
      asking_price: 12345,
      currency: "EUR",
      office_url: "https://www.gov.uk/search-for-trademark",
      territory: ["United Kingdom", "Ireland"],
      filing_date: "2019-04-12",
      license_duration: "5 years",
      license_renewable: true,
      encumbrances: "Probe encumbrance text.",
      quality_control: "Probe QC text.",
      is_published: true,
    })
    .select("id, nice_classes, currency, territory, license_renewable")
    .single();
  check("expanded insert through RLS", !insErr, insErr?.message);
  check(
    "arrays & currency round-trip",
    created &&
      created.currency === "EUR" &&
      created.nice_classes.join() === "9,42" &&
      created.territory.length === 2 &&
      created.license_renewable === true,
  );
  const probeId = created?.id;
  cleanup.probeId = probeId;

  // certificate_path pointing at ANOTHER member's folder must be rejected at
  // the DB (ip_assets_certificate_owner_folder CHECK), not just the action.
  const { error: foreignCert } = await owner.client
    .from("ip_assets")
    .update({ certificate_path: `${other.userId}/stolen-cert.pdf` })
    .eq("id", probeId);
  check(
    "cross-owner certificate_path rejected by DB CHECK",
    !!foreignCert,
    foreignCert?.message ?? "update accepted",
  );

  // ---- 2. CHECK constraints ----------------------------------------------
  const { error: badCur } = await owner.client
    .from("ip_assets")
    .insert({
      owner_id: owner.userId,
      title: "BAD-CURRENCY",
      deal_type: "sale",
      currency: "pounds",
    });
  check("invalid currency rejected", !!badCur, badCur?.message ?? "row accepted");

  const { error: badNice } = await owner.client
    .from("ip_assets")
    .insert({
      owner_id: owner.userId,
      title: "BAD-NICE",
      deal_type: "sale",
      nice_classes: [46],
    });
  check("Nice class 46 rejected", !!badNice, badNice?.message ?? "row accepted");

  // ---- 3. Nice-class containment filter ----------------------------------
  const { data: filtered } = await other.client
    .from("ip_assets")
    .select("id, title")
    .eq("is_published", true)
    .contains("nice_classes", [42]);
  check(
    "browse filter matches by containment",
    (filtered ?? []).some((r) => r.id === probeId),
    `${filtered?.length ?? 0} rows for class 42`,
  );

  // ---- 4. Storage RLS ------------------------------------------------------
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );

  // Fresh UUID names each run (mirrors the app) — no upsert, so the run
  // doesn't depend on an UPDATE policy the buckets deliberately don't have.
  const ownPath = `${owner.userId}/${crypto.randomUUID()}-probe.png`;
  cleanup.ownPath = ownPath;
  const { error: upOwn } = await owner.client.storage
    .from("listing-images")
    .upload(ownPath, png, { contentType: "image/png" });
  check("upload into own images folder", !upOwn, upOwn?.message);

  const foreignPath = `${other.userId}/verify-intruder.png`;
  const { error: upForeign } = await owner.client.storage
    .from("listing-images")
    .upload(foreignPath, png, { contentType: "image/png" });
  check(
    "upload into ANOTHER member's folder blocked",
    !!upForeign,
    upForeign?.message ?? "upload accepted",
  );

  const docPath = `${owner.userId}/${crypto.randomUUID()}-cert.pdf`;
  cleanup.docPath = docPath;
  const { error: upDoc } = await owner.client.storage
    .from("listing-docs")
    .upload(docPath, png, { contentType: "application/pdf" });
  check("upload certificate to own docs folder", !upDoc, upDoc?.message);

  // Anon (no session) must not read the private docs bucket.
  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: anonDoc } = await anonClient.storage
    .from("listing-docs")
    .download(docPath);
  check("anon blocked from listing-docs", !anonDoc);

  // A DIFFERENT signed-in member may read docs (certificates are for buyers).
  const { data: memberDoc } = await other.client.storage
    .from("listing-docs")
    .download(docPath);
  check("signed-in member can read certificate", !!memberDoc);

  // Public bucket URL serves without auth.
  const { data: pub } = owner.client.storage
    .from("listing-images")
    .getPublicUrl(ownPath);
  const pubRes = await fetch(pub.publicUrl);
  check("public image URL serves", pubRes.ok, `status ${pubRes.status}`);

  // ---- 5. Authed HTTP smoke ------------------------------------------------
  const cookie = ssrCookie(other.session); // browse as a non-owner
  const browse = await fetch("http://localhost:3000/listings?nice_class=42", {
    headers: { Cookie: cookie },
  });
  const browseHtml = await browse.text();
  check(
    "browse renders probe under class-42 filter",
    browse.ok && browseHtml.includes("VERIFY-EXPANSION"),
    `status ${browse.status}`,
  );

  const detail = await fetch(`http://localhost:3000/listings/${probeId}`, {
    headers: { Cookie: cookie },
  });
  const detailHtml = await detail.text();
  check("detail page renders", detail.ok, `status ${detail.status}`);
  for (const needle of [
    "Registration office",
    "Territory",
    "License duration",
    "Open to renewal",
    "Probe encumbrance text.",
    "Probe QC text.",
    "View official record",
    "Filing date",
  ]) {
    check(`detail shows ${JSON.stringify(needle)}`, detailHtml.includes(needle));
  }
  // EUR price renders (12,345 formatted, no decimals)
  check(
    "price renders in EUR",
    detailHtml.includes("€12,345"),
    "expected €12,345 in detail HTML",
  );

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
  return failures ? 1 : 0;
}

// Reap probe data even when the run crashes mid-way (dev server down, etc.).
async function reap() {
  const { owner, probeId, ownPath, docPath } = cleanup;
  if (!owner) return;
  try {
    if (probeId)
      await owner.client.from("ip_assets").delete().eq("id", probeId);
    if (ownPath)
      await owner.client.storage.from("listing-images").remove([ownPath]);
    if (docPath)
      await owner.client.storage.from("listing-docs").remove([docPath]);
  } catch {
    // best-effort
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
