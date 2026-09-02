// EUIPO registry adapter (EU trade marks).
//
// parse() maps eSearch Plus-shaped JSON onto NormalizedOfficeRecord. It is
// pure and covered by test/lib/ingestion.test.ts.
//
// fetchBatch() reads the committed fixture (euipo.sample.json) until the live
// feed is activated. TODO(live): when INGESTION_LIVE=true, fetch instead from
// one of (founder picks at activation - docs/INGESTION.md):
//   * EUIPO Open Data Portal - full EUTM register as bulk XML, free, daily,
//     no licence; the full-sync path; or
//   * eSearch Plus REST API - OAuth2 (EUIPO_API_CLIENT_ID/_SECRET), JSON;
//     the bounded/incremental path.
// Live pulls stay BOUNDED (Nice class / date window) - never the whole
// multi-million-row register.

import { readFileSync } from "node:fs";

import {
  cleanText,
  normalizeNiceClasses,
  normalizeStatus,
  parseIsoDate,
} from "../normalize.mjs";

/** @typedef {import("../types").NormalizedOfficeRecord} NormalizedOfficeRecord */
/** @typedef {import("../types").RegistrySource} RegistrySource */

function readFixture() {
  try {
    return readFileSync(new URL("./euipo.sample.json", import.meta.url), "utf8");
  } catch {
    // Vitest serves modules from a non-file URL scheme; scripts and tests
    // already run from the repo root (same convention as .env.local loading).
    return readFileSync("lib/ingestion/sources/euipo.sample.json", "utf8");
  }
}

/**
 * Map one eSearch Plus-shaped payload to a normalised record, or null when
 * it lacks the registry identifier we key on.
 *
 * @param {unknown} payload
 * @returns {NormalizedOfficeRecord | null}
 */
function parseOne(payload) {
  if (typeof payload !== "object" || payload === null) return null;
  const p = /** @type {Record<string, unknown>} */ (payload);

  const officeRef = cleanText(p.applicationNumber);
  if (!officeRef) return null;

  const wordSpec =
    typeof p.wordMarkSpecification === "object" && p.wordMarkSpecification !== null
      ? /** @type {Record<string, unknown>} */ (p.wordMarkSpecification)
      : null;
  const applicant =
    Array.isArray(p.applicants) &&
    typeof p.applicants[0] === "object" &&
    p.applicants[0] !== null
      ? /** @type {Record<string, unknown>} */ (p.applicants[0])
      : null;

  const ownerCountry = cleanText(applicant?.countryCode);

  return {
    registry: "euipo",
    office_ref: officeRef,
    mark_text: cleanText(wordSpec?.verbalElement),
    mark_kind: cleanText(p.markFeature),
    mark_image_url: cleanText(p.markImageUrl),
    nice_classes: normalizeNiceClasses(p.niceClasses),
    status: normalizeStatus(p.status),
    status_raw: cleanText(p.status),
    filing_date: parseIsoDate(p.applicationDate),
    registration_date: parseIsoDate(p.registrationDate),
    expiry_date: parseIsoDate(p.expiryDate),
    owner_name: cleanText(applicant?.name),
    owner_country: ownerCountry ? ownerCountry.toUpperCase() : null,
    // An EUTM is a single unitary right covering the whole EU.
    territory: ["EU"],
    office_url: `https://euipo.europa.eu/eSearch/#details/trademarks/${officeRef}`,
    source_updated_at: parseIsoDate(p.statusDate),
    raw: payload,
  };
}

/** @type {RegistrySource} */
export const EUIPO_SOURCE = {
  id: "euipo",

  async fetchBatch(opts = {}) {
    if (process.env.INGESTION_LIVE === "true") {
      throw new Error(
        "INGESTION_LIVE=true but the live EUIPO feed is not wired yet - " +
          "see docs/INGESTION.md (activation) for the Open Data / eSearch " +
          "Plus options. Unset INGESTION_LIVE to ingest the fixture.",
      );
    }
    /** @type {unknown[]} */
    const payloads = JSON.parse(readFixture());
    return typeof opts.limit === "number" ? payloads.slice(0, opts.limit) : payloads;
  },

  parse(payloads) {
    /** @type {NormalizedOfficeRecord[]} */
    const records = [];
    for (const payload of payloads) {
      const record = parseOne(payload);
      if (record) records.push(record);
    }
    return records;
  },
};
