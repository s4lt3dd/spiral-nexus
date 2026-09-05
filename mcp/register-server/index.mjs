// Spiral Nexus register MCP — read-only concierge access to official IP-office
// register data (ip_office_records + trademark_non_use_radar).
//
// This is the internal matchmaking surface (docs/STRATEGY.md §7 #1/#3): staff
// ask a model "which dormant class-3 marks are near grace-end, and who might
// want them?" and broker the introduction manually. It is NOT a product
// surface and register data is never supply — candidates, not proof of
// non-use; presence on the register never implies the owner wants to deal.
//
// Security model (docs/INGESTION.md):
//   * Connects as the dedicated `register_reader` Postgres role, whose ONLY
//     grants are SELECT on the two register objects — it structurally cannot
//     read user, listing, or message data.
//   * Every query runs in an explicit READ ONLY transaction (db.mjs).
//   * Every query is parameterised; tool inputs are validated with zod and
//     limits are clamped server-side.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createPool, loadConnectionString, readOnlyQuery } from "./db.mjs";

const connectionString = loadConnectionString();
if (!connectionString) {
  console.error(
    "REGISTER_READONLY_DATABASE_URL is not set (env or .env.local). Point it " +
      "at Postgres as the register_reader role (see docs/INGESTION.md — " +
      "'Enable the register MCP').",
  );
  process.exit(1);
}

const pool = createPool(connectionString, { max: 3 });

/** Run a parameterised query (read-only transaction) and return rows. */
const query = (text, params = []) => readOnlyQuery(pool, text, params);

/** Standard MCP text result from any JSON-able value. */
function jsonResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

const clamp = (n, fallback, max) =>
  Math.min(Math.max(Number.isInteger(n) ? n : fallback, 1), max);

const server = new McpServer({
  name: "spiral-nexus-register",
  version: "0.1.0",
});

server.registerTool(
  "describe_data",
  {
    title: "Describe the register dataset",
    description:
      "Shape and live distribution of the ingested IP-office register data: " +
      "row counts by registry/status, non-use radar bucket distribution, and " +
      "the meaning of every column. Call this first to see what's available.",
    inputSchema: {},
  },
  async () => {
    const [totals, byStatus, byBucket, graceRange] = await Promise.all([
      query(
        "select registry, count(*)::int as records from ip_office_records group by registry order by registry",
      ),
      query(
        "select status, count(*)::int as records from ip_office_records group by status order by records desc",
      ),
      query(
        "select radar_bucket, count(*)::int as marks from trademark_non_use_radar group by radar_bucket",
      ),
      query(
        "select min(grace_period_ends) as earliest, max(grace_period_ends) as latest from trademark_non_use_radar",
      ),
    ]);
    return jsonResult({
      what_this_is:
        "Official IP-office register records ingested for intelligence (non-use radar, verification, valuation, matching). NEVER supply: presence here does not mean the owner wants to deal, and radar buckets are exposure candidates, not proof of non-use.",
      non_use_clock:
        "Art. 18 EUTMR: an EU mark must be put to genuine use within 5 years of registration. grace_period_ends = registration_date + 5 years. Buckets: vulnerable (grace ended), approaching (ends within 180 days), watch (>180 days).",
      records_by_registry: totals,
      records_by_status: byStatus,
      radar_bucket_distribution: byBucket,
      radar_grace_window: graceRange[0],
      columns: {
        office_ref: "The registry's own identifier (e.g. EUTM application number)",
        mark_text: "Verbal element of the mark (null for purely figurative marks)",
        mark_kind: "Word / Figurative / Combined, as reported by the office",
        nice_classes: "Nice classification classes (1-45)",
        status: "Normalised: registered | pending | expired | opposed | withdrawn | other (raw wording in status_raw)",
        filing_date: "Application date",
        registration_date: "Registration date — starts the 5-year genuine-use clock",
        grace_period_ends: "registration_date + 5 years (Art. 18 EUTMR)",
        owner_name: "Registered proprietor (from the public register)",
        owner_country: "Proprietor country code",
        office_url: "Deep link to the official registry record",
      },
    });
  },
);

server.registerTool(
  "search_register",
  {
    title: "Search the register",
    description:
      "Search ingested register records by text (mark and owner name), Nice " +
      "class, status, or owner country. Returns full records with the grace " +
      "clock. Use non_use_radar for the ranked outreach-candidate list.",
    inputSchema: {
      query: z
        .string()
        .max(200)
        .optional()
        .describe("Case-insensitive substring match on mark_text or owner_name"),
      nice_class: z.number().int().min(1).max(45).optional(),
      status: z
        .enum(["registered", "pending", "expired", "opposed", "withdrawn", "other"])
        .optional(),
      owner_country: z
        .string()
        .length(2)
        .optional()
        .describe("Two-letter country code, e.g. DE"),
      limit: z.number().int().min(1).max(100).optional().describe("Default 20"),
    },
  },
  async ({ query: q, nice_class, status, owner_country, limit }) => {
    const rows = await query(
      `select registry, office_ref, mark_text, mark_kind, nice_classes,
              status, status_raw, filing_date, registration_date, expiry_date,
              grace_period_ends, owner_name, owner_country, office_url
         from ip_office_records
        where ($1::text is null
               or mark_text ilike '%' || $1 || '%'
               or owner_name ilike '%' || $1 || '%')
          and ($2::int is null or nice_classes @> array[$2::int])
          and ($3::office_record_status is null or status = $3::office_record_status)
          and ($4::text is null or owner_country = upper($4))
        order by mark_text asc nulls last
        limit $5`,
      [q ?? null, nice_class ?? null, status ?? null, owner_country ?? null, clamp(limit, 20, 100)],
    );
    return jsonResult({ matches: rows.length, records: rows });
  },
);

server.registerTool(
  "non_use_radar",
  {
    title: "Non-use radar",
    description:
      "Ranked outreach candidates: registered marks ordered by how close " +
      "their 5-year genuine-use grace period is to ending (Art. 18 EUTMR). " +
      "Buckets: vulnerable (grace ended — revocable for non-use today), " +
      "approaching (ends within 180 days), watch (>180 days). These are " +
      "exposure candidates, NOT proof of non-use.",
    inputSchema: {
      bucket: z.enum(["vulnerable", "approaching", "watch"]).optional(),
      nice_class: z.number().int().min(1).max(45).optional(),
      limit: z.number().int().min(1).max(100).optional().describe("Default 25"),
    },
  },
  async ({ bucket, nice_class, limit }) => {
    const rows = await query(
      `select office_ref, mark_text, mark_kind, nice_classes,
              registration_date, grace_period_ends, days_to_grace_end,
              radar_bucket, owner_name, owner_country, office_url
         from trademark_non_use_radar
        where ($1::text is null or radar_bucket = $1)
          and ($2::int is null or nice_classes @> array[$2::int])
        order by grace_period_ends asc
        limit $3`,
      [bucket ?? null, nice_class ?? null, clamp(limit, 25, 100)],
    );
    return jsonResult({ candidates: rows.length, radar: rows });
  },
);

server.registerTool(
  "find_similar_marks",
  {
    title: "Find similar marks",
    description:
      "Trigram text-similarity search over register mark names — 'is there " +
      "already a mark like X?' / 'what could a buyer wanting X license " +
      "instead?'. Optionally narrowed to a Nice class. (Upgrades to semantic " +
      "embeddings in the vector slice.)",
    inputSchema: {
      text: z.string().min(2).max(120).describe("Name or phrase to compare against"),
      nice_class: z.number().int().min(1).max(45).optional(),
      limit: z.number().int().min(1).max(50).optional().describe("Default 10"),
    },
  },
  async ({ text, nice_class, limit }) => {
    const rows = await query(
      `select office_ref, mark_text, nice_classes, status,
              registration_date, grace_period_ends, owner_name, owner_country,
              office_url,
              round(similarity(mark_text, $1)::numeric, 3) as similarity
         from ip_office_records
        where mark_text is not null
          and ($2::int is null or nice_classes @> array[$2::int])
        order by mark_text <-> $1
        limit $3`,
      [text, nice_class ?? null, clamp(limit, 10, 50)],
    );
    return jsonResult({ query: text, matches: rows });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("spiral-nexus-register MCP ready (read-only, register_reader).");
