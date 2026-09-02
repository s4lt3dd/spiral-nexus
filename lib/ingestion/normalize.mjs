// Pure normalisation helpers for IP-office payloads. No I/O, no clients —
// everything here is deterministic and unit-tested (test/lib/ingestion.test.ts).
//
// JSDoc-typed .mjs (tsconfig has allowJs) so the same implementation runs in
// Node seed scripts, Vitest, and future Next.js route handlers.

/** @typedef {import("./types").NormalizedOfficeRecord} NormalizedOfficeRecord */
/** @typedef {import("../types").OfficeRecordStatus} OfficeRecordStatus */

/**
 * Map an office's raw status wording onto our office_record_status enum.
 *
 * Order matters: specific terminal states first, then the broad "pending"
 * catch-alls. Unknown wording maps to "other" — never guess "registered",
 * because a false "registered" could put a mark on the non-use radar and
 * drive outreach; a false "other"/"withdrawn" merely hides it (safe).
 * The raw wording is always preserved in status_raw alongside.
 *
 * @param {unknown} raw
 * @returns {OfficeRecordStatus}
 */
export function normalizeStatus(raw) {
  if (typeof raw !== "string") return "other";
  const s = raw.trim().toLowerCase();
  if (!s) return "other";

  if (s === "registered") return "registered";
  if (s.includes("expired") || s.includes("lapsed")) return "expired";
  if (s.includes("opposition") || s.includes("opposed")) return "opposed";
  // Includes "registration cancellation pending": still nominally in force,
  // but treated as withdrawn here so a mark under attack never drives
  // non-use outreach.
  if (
    s.includes("withdrawn") ||
    s.includes("surrendered") ||
    s.includes("cancel") ||
    s.includes("refused") ||
    s.includes("rejected") ||
    s.includes("invalid")
  ) {
    return "withdrawn";
  }
  if (s.startsWith("registered")) return "registered";
  if (
    s.startsWith("application") ||
    s.includes("examination") ||
    s.includes("published") ||
    s.includes("filed") ||
    s.includes("pending")
  ) {
    return "pending";
  }
  return "other";
}

/**
 * Parse an office-supplied date into strict ISO `yyyy-mm-dd`, or null.
 *
 * Accepts the formats seen across registry feeds: "2021-06-28",
 * "2021-06-28T10:00:00Z", "28/06/2021", "20210628". Rejects impossible
 * calendar dates (e.g. 2021-02-30) instead of letting Date roll them over.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function parseIsoDate(value) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  let y, m, d;
  let match;
  if ((match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s))) {
    [, y, m, d] = match;
  } else if ((match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s))) {
    [, d, m, y] = match;
  } else if ((match = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) {
    [, y, m, d] = match;
  } else {
    return null;
  }

  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  // Reconstruct-and-compare so JS Date rollover can't validate 2021-02-30.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Normalise Nice classes to a sorted, de-duplicated int[] within 1–45.
 * Accepts an array of numbers/strings, a single value, or a comma-separated
 * string ("3, 5, 44"). Anything unusable is dropped, never guessed.
 *
 * @param {unknown} value
 * @returns {number[]}
 */
export function normalizeNiceClasses(value) {
  /** @type {unknown[]} */
  let items;
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string") {
    items = value.split(",");
  } else if (typeof value === "number") {
    items = [value];
  } else {
    return [];
  }

  const classes = new Set();
  for (const item of items) {
    const n =
      typeof item === "number"
        ? item
        : typeof item === "string"
          ? Number(item.trim())
          : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= 45) classes.add(n);
  }
  return [...classes].sort((a, b) => a - b);
}

/**
 * Trim a free-text field to a non-empty string or null.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function cleanText(value) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s || null;
}
