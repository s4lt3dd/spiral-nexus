// Verify the IP-office ingestion slice against the real DB.
// Run AFTER seed.mjs (for an authenticated user) - seeds its own register
// records:  node supabase/seed/verify-ingestion.mjs
//
// Covers: upsert idempotency, the Art. 18 grace-period math, radar bucketing,
// and - critically - that the app's API surface (anon + authenticated) cannot
// read register data at all (grants revoked; see the ingestion migration).
// Exits non-zero on any failure.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { EUIPO_SOURCE } from "../../lib/ingestion/sources/euipo.mjs";
import { upsertOfficeRecords } from "../../lib/ingestion/upsert.mjs";
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
if (!url || !anon || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

// registration_date + 5 calendar years, mirroring Postgres interval maths
// (which lands 29 Feb on 28 Feb in non-leap years).
function graceFromRegistration(iso) {
  const [y, m, d] = iso.split("-");
  const md = `${m}-${d}` === "02-29" ? "02-28" : `${m}-${d}`;
  return `${Number(y) + 5}-${md}`;
}

async function main() {
  // ---- ingest twice: idempotency ----
  const records = EUIPO_SOURCE.parse(await EUIPO_SOURCE.fetchBatch());
  await upsertOfficeRecords(admin, records);
  const { count: afterFirst } = await admin
    .from("ip_office_records")
    .select("*", { count: "exact", head: true });
  await upsertOfficeRecords(admin, records);
  const { count: afterSecond } = await admin
    .from("ip_office_records")
    .select("*", { count: "exact", head: true });
  check(
    "re-ingesting the same batch is idempotent",
    afterFirst === afterSecond && afterFirst >= records.length,
    `${afterFirst} -> ${afterSecond} rows`,
  );

  // ---- grace-period maths (Art. 18: registration + 5 years) ----
  const { data: registered } = await admin
    .from("ip_office_records")
    .select("office_ref, registration_date, grace_period_ends, status")
    .not("registration_date", "is", null);
  const graceOk = registered.every(
    (r) => r.grace_period_ends === graceFromRegistration(r.registration_date),
  );
  check(
    "grace_period_ends = registration_date + 5 calendar years (all rows)",
    registered.length > 0 && graceOk,
    `${registered.length} dated row(s)`,
  );

  // ---- radar view: membership + bucketing ----
  const { data: radar } = await admin
    .from("trademark_non_use_radar")
    .select("office_ref, grace_period_ends, days_to_grace_end, radar_bucket");
  const expectedMembers = registered.filter((r) => r.status === "registered");
  check(
    "radar contains exactly the registered marks with a clock",
    radar.length === expectedMembers.length &&
      new Set(radar.map((r) => r.office_ref)).size === radar.length,
    `${radar.length} radar row(s) vs ${expectedMembers.length} registered`,
  );

  // Buckets must agree with the view's own day count (no clock dependency)…
  const bucketOf = (days) =>
    days < 0 ? "vulnerable" : days <= 180 ? "approaching" : "watch";
  check(
    "radar_bucket agrees with days_to_grace_end on every row",
    radar.every((r) => r.radar_bucket === bucketOf(r.days_to_grace_end)),
  );
  // …and the day count must agree with real time (±1 day around midnight).
  const todayUtc = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const daysOk = radar.every((r) => {
    const grace = new Date(`${r.grace_period_ends}T00:00:00Z`).getTime();
    const jsDays = Math.round((grace - todayUtc) / 86_400_000);
    return Math.abs(jsDays - r.days_to_grace_end) <= 1;
  });
  check("days_to_grace_end matches calendar time", daysOk);
  const buckets = new Set(radar.map((r) => r.radar_bucket));
  check(
    "fixture populates every radar bucket",
    ["vulnerable", "approaching", "watch"].every((b) => buckets.has(b)),
    [...buckets].join(", "),
  );

  // ---- the app's API surface must not see register data at all ----
  const anonClient = userClient();
  const { error: anonTableErr } = await anonClient
    .from("ip_office_records")
    .select("id")
    .limit(1);
  check("anon cannot read ip_office_records", anonTableErr !== null, anonTableErr?.code);
  const { error: anonViewErr } = await anonClient
    .from("trademark_non_use_radar")
    .select("office_ref")
    .limit(1);
  check("anon cannot read trademark_non_use_radar", anonViewErr !== null, anonViewErr?.code);
  const { error: anonInsertErr } = await anonClient
    .from("ip_office_records")
    .insert({ registry: "euipo", office_ref: "999999999" });
  check("anon cannot write ip_office_records", anonInsertErr !== null, anonInsertErr?.code);

  const signedIn = userClient();
  const { error: signInErr } = await signedIn.auth.signInWithPassword({
    email: OWNERS[0].email,
    password: TEST_PASSWORD,
  });
  if (signInErr) {
    check("authenticated check (run seed.mjs first)", false, signInErr.message);
  } else {
    const { error: authTableErr } = await signedIn
      .from("ip_office_records")
      .select("id")
      .limit(1);
    check(
      "authenticated users cannot read ip_office_records",
      authTableErr !== null,
      authTableErr?.code,
    );
    const { error: authViewErr } = await signedIn
      .from("trademark_non_use_radar")
      .select("office_ref")
      .limit(1);
    check(
      "authenticated users cannot read the radar view",
      authViewErr !== null,
      authViewErr?.code,
    );
  }

  console.log(
    `\n${failures === 0 ? "ALL INGESTION CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-ingestion error:", e.message ?? e);
  process.exit(1);
});
