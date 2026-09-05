// Shared connection setup for the register MCP and its verify/smoke scripts.
//
// Deliberate behaviours:
//   * The connection string comes from REGISTER_READONLY_DATABASE_URL, falling
//     back to the repo's gitignored .env.local (docs/INGESTION.md). The
//     credential therefore lives in exactly one place and never has to be
//     copied into MCP client config.
//   * TLS is decided here, not by the URL. `pg` lets `?sslmode=` in the URL
//     override the `ssl` option and treats `require` as verify-full, which
//     rejects Supabase's self-signed CA chain. We strip the parameter and
//     enable TLS (without CA verification) for hosted Supabase or any explicit
//     sslmode; local supabase (127.0.0.1) gets no TLS.
//   * Every query runs inside an explicit READ ONLY transaction with a pinned
//     search_path (pg_trgm lives in `extensions` on hosted Supabase, `public`
//     on the local CLI). This is belt and braces on top of the role's grants,
//     and avoids pg's deprecated fire-and-forget `SET` on the connect event.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ENV_KEY = "REGISTER_READONLY_DATABASE_URL";

// Postgres `date` columns (OID 1082) must surface as plain ISO dates. By
// default pg converts them to JS Dates in the local timezone, which the
// JSON output then renders as e.g. "2021-09-14T23:00:00.000Z" for a
// registration on 2021-09-15 - an off-by-one for anyone west of UTC+0 and a
// misleading timestamp for everyone.
pg.types.setTypeParser(1082, (value) => value);

/** Resolve the register_reader connection string, or undefined. */
export function loadConnectionString() {
  if (process.env[ENV_KEY]) return process.env[ENV_KEY];
  const envPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../.env.local",
  );
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (line.startsWith(`${ENV_KEY}=`)) {
        const value = line.slice(ENV_KEY.length + 1).trim();
        if (value) return value;
      }
    }
  } catch {
    // No .env.local - the caller reports the missing variable.
  }
  return undefined;
}

/** Create a pool as register_reader. Use readOnlyQuery() to run statements. */
export function createPool(connectionString, { max = 3 } = {}) {
  const url = new URL(connectionString);
  const wantsTls =
    /supabase\.(co|com)$/.test(url.hostname) || url.searchParams.has("sslmode");
  url.searchParams.delete("sslmode");

  return new pg.Pool({
    connectionString: url.toString(),
    max,
    ssl: wantsTls ? { rejectUnauthorized: false } : undefined,
  });
}

/**
 * Run one parameterised statement inside a READ ONLY transaction and return
 * its rows. Any write attempt fails with 25006 (read_only_sql_transaction)
 * before the role's grants are even consulted.
 */
export async function readOnlyQuery(pool, text, params = []) {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    await client.query("set local search_path = public, extensions");
    const result = await client.query(text, params);
    await client.query("commit");
    return result.rows;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
