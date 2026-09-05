// Smoke-test the register MCP end to end: spawn index.mjs, speak MCP
// JSON-RPC over stdio as a real client, call all four tools, and check the
// answers against the committed EUIPO fixture.
//
// Run after the fixture is ingested (supabase/seed/seed-office-records.mjs)
// and the register_reader login is configured (docs/INGESTION.md):
//   npm run smoke
// Exits non-zero on any failure.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(here, "index.mjs");
const FIXTURE = path.resolve(here, "../../lib/ingestion/sources/euipo.sample.json");

const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
const fixtureRefs = new Set(fixture.map((r) => r.applicationNumber));
const fixtureRegistered = fixture.filter(
  (r) => r.status === "Registered" && r.registrationDate,
);
const sampleName = fixture.find((r) => r.wordMarkSpecification?.verbalElement)
  .wordMarkSpecification.verbalElement;

const child = spawn(process.execPath, [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
child.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

// ---- minimal JSON-RPC client over newline-delimited stdio ----
let buffer = "";
const pending = new Map();
child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) =>
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result),
    );
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`timeout: ${method}`));
    }, 30_000);
  });
}
function notify(method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
}
async function callTool(name, args = {}) {
  const res = await rpc("tools/call", { name, arguments: args });
  if (res.isError) throw new Error(`${name} isError: ${res.content?.[0]?.text}`);
  return JSON.parse(res.content[0].text);
}

let failures = 0;
function check(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function main() {
  const init = await rpc("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "spiral-nexus-register-smoke", version: "0.0.0" },
  });
  check("initialize", init.serverInfo?.name === "spiral-nexus-register", init.serverInfo?.name);
  notify("notifications/initialized", {});

  const tools = await rpc("tools/list", {});
  const names = tools.tools.map((t) => t.name).sort();
  check(
    "tools/list exposes the four tools",
    names.join() === "describe_data,find_similar_marks,non_use_radar,search_register",
    names.join(", "),
  );

  // ---- describe_data ----
  const d = await callTool("describe_data");
  const euipo = d.records_by_registry.find((r) => r.registry === "euipo");
  check(
    "describe_data: euipo count >= fixture size",
    euipo?.records >= fixture.length,
    `${euipo?.records} vs ${fixture.length}`,
  );
  const buckets = Object.fromEntries(
    d.radar_bucket_distribution.map((b) => [b.radar_bucket, b.marks]),
  );
  check(
    "describe_data: all three radar buckets present",
    ["vulnerable", "approaching", "watch"].every((b) => buckets[b] > 0),
    JSON.stringify(buckets),
  );
  const radarTotal = Object.values(buckets).reduce((a, b) => a + b, 0);

  // ---- search_register ----
  const byStatus = await callTool("search_register", { status: "registered", limit: 100 });
  check(
    "search_register: status filter returns only registered",
    byStatus.matches > 0 && byStatus.records.every((r) => r.status === "registered"),
    `${byStatus.matches} rows`,
  );
  check(
    "search_register: every ref belongs to the fixture",
    byStatus.records.every((r) => fixtureRefs.has(r.office_ref)),
  );
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  check(
    "search_register: dates are plain ISO dates, not timestamps",
    byStatus.records.every(
      (r) =>
        isoDate.test(r.registration_date) &&
        isoDate.test(r.grace_period_ends) &&
        (r.filing_date === null || isoDate.test(r.filing_date)),
    ),
    `e.g. ${byStatus.records[0]?.registration_date}`,
  );
  const fixtureDates = new Map(
    fixtureRegistered.map((r) => [r.applicationNumber, r.registrationDate]),
  );
  check(
    "search_register: registration_date matches the fixture exactly",
    byStatus.records.every((r) => fixtureDates.get(r.office_ref) === r.registration_date),
  );
  const byClass = await callTool("search_register", { nice_class: 3, limit: 100 });
  check(
    "search_register: nice_class filter honoured",
    byClass.records.every((r) => r.nice_classes.includes(3)),
    `${byClass.matches} rows`,
  );
  const prefix = sampleName.slice(0, 4);
  const byText = await callTool("search_register", { query: prefix });
  check(
    `search_register: text query "${prefix}" finds ${sampleName}`,
    byText.records.some((r) => r.mark_text === sampleName),
    `${byText.matches} rows`,
  );
  const byCountry = await callTool("search_register", { owner_country: "de", limit: 100 });
  check(
    "search_register: owner_country is upper-cased",
    byCountry.records.every((r) => r.owner_country === "DE"),
    `${byCountry.matches} rows`,
  );

  // ---- non_use_radar ----
  const radar = await callTool("non_use_radar", { limit: 100 });
  check(
    "non_use_radar: total matches describe_data",
    radar.candidates === radarTotal,
    `${radar.candidates} vs ${radarTotal}`,
  );
  check(
    "non_use_radar: exactly the registered+dated fixture marks",
    radar.candidates === fixtureRegistered.length,
    `${radar.candidates} vs ${fixtureRegistered.length}`,
  );
  check(
    "non_use_radar: ordered by grace_period_ends asc",
    radar.radar.every((row, i, a) => i === 0 || a[i - 1].grace_period_ends <= row.grace_period_ends),
  );
  const bucketOf = (days) => (days < 0 ? "vulnerable" : days <= 180 ? "approaching" : "watch");
  check(
    "non_use_radar: bucket agrees with days_to_grace_end",
    radar.radar.every((r) => r.radar_bucket === bucketOf(r.days_to_grace_end)),
  );
  const vulnerable = await callTool("non_use_radar", { bucket: "vulnerable" });
  check(
    "non_use_radar: bucket filter",
    vulnerable.candidates === buckets.vulnerable &&
      vulnerable.radar.every((r) => r.radar_bucket === "vulnerable"),
    `${vulnerable.candidates} rows`,
  );

  // ---- find_similar_marks (pg_trgm resolution on the hosted schema) ----
  const exact = await callTool("find_similar_marks", { text: sampleName });
  check(
    `find_similar_marks: exact "${sampleName}" ranks first`,
    exact.matches[0]?.mark_text === sampleName,
    `top=${exact.matches[0]?.mark_text} similarity=${exact.matches[0]?.similarity}`,
  );
  const typo = `${sampleName.slice(0, -1)}X`;
  const fuzzy = await callTool("find_similar_marks", { text: typo, limit: 3 });
  check(
    `find_similar_marks: near-miss "${typo}" still finds it`,
    fuzzy.matches.some((m) => m.mark_text === sampleName),
    `top=${fuzzy.matches[0]?.mark_text}`,
  );

  // ---- input validation ----
  const bad = await rpc("tools/call", {
    name: "search_register",
    arguments: { nice_class: 99 },
  }).then((r) => Boolean(r.isError), () => true);
  check("zod rejects nice_class 99", bad);

  console.log(
    `\n${failures === 0 ? "ALL MCP SMOKE CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`,
  );
  child.kill();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("smoke error:", e.message ?? e);
  child.kill();
  process.exit(1);
});
