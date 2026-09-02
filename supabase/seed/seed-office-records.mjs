// Seed IP-office register records (EUIPO fixture) into ip_office_records.
//
// This is the ingestion write path until the live feed is activated
// (docs/INGESTION.md): source adapter -> normalise -> idempotent upsert.
// Safe to re-run; keyed on (registry, office_ref).
//
// Usage:  node supabase/seed/seed-office-records.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// The service-role key is used here ONLY in this local script - never shipped.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { EUIPO_SOURCE } from "../../lib/ingestion/sources/euipo.mjs";
import { upsertOfficeRecords } from "../../lib/ingestion/upsert.mjs";

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Fetching ${EUIPO_SOURCE.id} batch…`);
  const payloads = await EUIPO_SOURCE.fetchBatch();
  const records = EUIPO_SOURCE.parse(payloads);
  console.log(`  ${payloads.length} payload(s) -> ${records.length} normalised record(s)`);

  const { upserted } = await upsertOfficeRecords(admin, records);
  console.log(`Upserted ${upserted} register record(s).`);

  // Show the radar so the concierge surface never demos empty.
  const { data: radar, error } = await admin
    .from("trademark_non_use_radar")
    .select("radar_bucket");
  if (error) throw new Error(`radar read failed: ${error.message}`);
  const buckets = { vulnerable: 0, approaching: 0, watch: 0 };
  for (const row of radar) buckets[row.radar_bucket] += 1;
  console.log(
    `Non-use radar: ${radar.length} registered mark(s) on the clock - ` +
      `${buckets.vulnerable} vulnerable, ${buckets.approaching} approaching, ` +
      `${buckets.watch} watch.`,
  );
}

main().catch((e) => {
  console.error("seed-office-records error:", e.message ?? e);
  process.exit(1);
});
