// Shapes for the IP-office ingestion pipeline (see docs/INGESTION.md).
//
// The pipeline is source-agnostic: each registry gets a RegistrySource
// adapter (lib/ingestion/sources/*) that fetches raw office payloads and
// parses them into NormalizedOfficeRecord — the one shape upsert.mjs writes
// to ip_office_records. Adding UKIPO/USPTO later means adding an adapter,
// never touching the core.
//
// Implementation lives in JSDoc-typed .mjs modules (normalize.mjs,
// sources/euipo.mjs, upsert.mjs) so the same code runs in Node seed scripts,
// Vitest, and (at live activation) Next.js route handlers.

import type { OfficeRecordStatus, Registry } from "@/lib/types";

// A register record normalised to our vocabulary, ready to upsert. Matches
// ip_office_records minus the database-owned columns (id, grace_period_ends,
// ingested_at).
export interface NormalizedOfficeRecord {
  registry: Registry;
  office_ref: string;
  mark_text: string | null;
  mark_kind: string | null;
  mark_image_url: string | null;
  nice_classes: number[];
  status: OfficeRecordStatus;
  status_raw: string | null;
  filing_date: string | null;
  registration_date: string | null;
  expiry_date: string | null;
  owner_name: string | null;
  owner_country: string | null;
  territory: string[];
  office_url: string | null;
  source_updated_at: string | null;
  raw: unknown;
}

export interface FetchBatchOptions {
  // Cap the number of raw payloads returned. Live pulls are always bounded
  // (by Nice class / date window) — never the whole register.
  limit?: number;
}

export interface RegistrySource {
  id: Registry;
  // Returns raw office payloads (fixture rows today; live API/bulk rows once
  // INGESTION_LIVE is wired for this source).
  fetchBatch(opts?: FetchBatchOptions): Promise<unknown[]>;
  // Pure: maps raw payloads to normalised records, skipping unusable ones.
  parse(payloads: unknown[]): NormalizedOfficeRecord[];
}
