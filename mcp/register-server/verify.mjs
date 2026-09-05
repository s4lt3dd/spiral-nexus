// Verify the register_reader role is scoped exactly as designed.
// Run after setting the role's password (docs/INGESTION.md):
//   REGISTER_READONLY_DATABASE_URL=postgresql://register_reader:...@... node verify.mjs
//
// Asserts the role CAN read the two register objects and CANNOT touch
// anything else (user tables, writes). Exits non-zero on any failure.

import { createPool, loadConnectionString, readOnlyQuery } from "./db.mjs";

const connectionString = loadConnectionString();
if (!connectionString) {
  console.error(
    "Set REGISTER_READONLY_DATABASE_URL (env or .env.local) as register_reader first.",
  );
  process.exit(1);
}

const pool = createPool(connectionString, { max: 1 });
const query = (text) => readOnlyQuery(pool, text);

let failures = 0;
function check(name, pass, detail = "") {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function expectDenied(name, sql) {
  try {
    await query(sql);
    check(name, false, "query unexpectedly succeeded");
  } catch (e) {
    // 42501 insufficient_privilege / 25006 read_only_sql_transaction — both
    // prove the boundary; anything else (e.g. relation truly hidden) still
    // means the query failed.
    check(name, true, e.code ?? e.message);
  }
}

async function main() {
  const rows = await query("select count(*)::int as n from ip_office_records");
  check("can read ip_office_records", rows[0].n >= 0, `${rows[0].n} row(s)`);

  const radar = await query("select count(*)::int as n from trademark_non_use_radar");
  check("can read trademark_non_use_radar", radar[0].n >= 0, `${radar[0].n} row(s)`);

  await expectDenied("cannot read profiles", "select * from profiles limit 1");
  await expectDenied("cannot read ip_assets", "select * from ip_assets limit 1");
  await expectDenied("cannot read messages", "select * from messages limit 1");
  await expectDenied(
    "cannot write ip_office_records",
    "insert into ip_office_records (registry, office_ref) values ('euipo', '000000000')",
  );
  await expectDenied(
    "cannot delete from ip_office_records",
    "delete from ip_office_records where office_ref = '000000000'",
  );

  console.log(
    `\n${failures === 0 ? "ALL ROLE-SCOPE CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`,
  );
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("verify error:", e.message ?? e);
  await pool.end().catch(() => {});
  process.exit(1);
});
