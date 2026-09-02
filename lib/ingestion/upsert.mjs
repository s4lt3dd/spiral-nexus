// Idempotent write path: normalised register records -> ip_office_records.
//
// Keyed on (registry, office_ref), so re-ingesting the same batch updates in
// place instead of duplicating. Callers pass a service-role supabase-js
// client (anon/authenticated are revoked on the table by design); today that
// is supabase/seed/seed-office-records.mjs, at live activation it will be the
// ingestion route handler.

/** @typedef {import("./types").NormalizedOfficeRecord} NormalizedOfficeRecord */

const CHUNK_SIZE = 500;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {NormalizedOfficeRecord[]} records
 * @returns {Promise<{ upserted: number }>}
 */
export async function upsertOfficeRecords(client, records) {
  let upserted = 0;
  // ingested_at defaults on insert only; set it explicitly so it always means
  // "last ingested", not "first ingested".
  const ingestedAt = new Date().toISOString();

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const rows = records
      .slice(i, i + CHUNK_SIZE)
      .map((record) => ({ ...record, ingested_at: ingestedAt }));
    const { error, count } = await client
      .from("ip_office_records")
      .upsert(rows, { onConflict: "registry,office_ref", count: "exact" });
    if (error) {
      throw new Error(`ip_office_records upsert failed: ${error.message}`);
    }
    upserted += count ?? rows.length;
  }

  return { upserted };
}
