import { describe, expect, it } from "vitest";

import {
  cleanText,
  normalizeNiceClasses,
  normalizeStatus,
  parseIsoDate,
} from "@/lib/ingestion/normalize.mjs";
import { EUIPO_SOURCE } from "@/lib/ingestion/sources/euipo.mjs";

describe("normalizeStatus", () => {
  it("maps office wording onto the normalised enum", () => {
    expect(normalizeStatus("Registered")).toBe("registered");
    expect(normalizeStatus("  registered ")).toBe("registered");
    expect(normalizeStatus("Application published")).toBe("pending");
    expect(normalizeStatus("Application under examination")).toBe("pending");
    expect(normalizeStatus("Application filed")).toBe("pending");
    expect(normalizeStatus("Opposition pending")).toBe("opposed");
    expect(normalizeStatus("Expired")).toBe("expired");
    expect(normalizeStatus("Lapsed")).toBe("expired");
    expect(normalizeStatus("Withdrawn")).toBe("withdrawn");
    expect(normalizeStatus("Surrendered")).toBe("withdrawn");
    expect(normalizeStatus("Refused")).toBe("withdrawn");
  });

  it("treats a registration under cancellation attack as non-registered", () => {
    // Deliberate: a mark being cancelled must never drive non-use outreach.
    expect(normalizeStatus("Registration cancellation pending")).toBe("withdrawn");
  });

  it("never guesses on unknown input", () => {
    expect(normalizeStatus("Some future status")).toBe("other");
    expect(normalizeStatus("")).toBe("other");
    expect(normalizeStatus(null)).toBe("other");
    expect(normalizeStatus(42)).toBe("other");
  });
});

describe("parseIsoDate", () => {
  it("accepts the formats seen across registry feeds", () => {
    expect(parseIsoDate("2021-06-28")).toBe("2021-06-28");
    expect(parseIsoDate("2021-06-28T10:00:00Z")).toBe("2021-06-28");
    expect(parseIsoDate("28/06/2021")).toBe("2021-06-28");
    expect(parseIsoDate("20210628")).toBe("2021-06-28");
    expect(parseIsoDate("2020-02-29")).toBe("2020-02-29"); // real leap day
  });

  it("rejects impossible or malformed dates instead of rolling them over", () => {
    expect(parseIsoDate("2021-02-30")).toBeNull();
    expect(parseIsoDate("2021-13-01")).toBeNull();
    expect(parseIsoDate("32/06/2021")).toBeNull();
    expect(parseIsoDate("June 28, 2021")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });
});

describe("normalizeNiceClasses", () => {
  it("normalises arrays, strings, and single values to sorted ints", () => {
    expect(normalizeNiceClasses([9, 3, 42])).toEqual([3, 9, 42]);
    expect(normalizeNiceClasses(["3", "5", 44])).toEqual([3, 5, 44]);
    expect(normalizeNiceClasses("3, 5, 44")).toEqual([3, 5, 44]);
    expect(normalizeNiceClasses(9)).toEqual([9]);
  });

  it("drops duplicates and out-of-range values, never guesses", () => {
    expect(normalizeNiceClasses([3, 3, 5])).toEqual([3, 5]);
    expect(normalizeNiceClasses([0, 46, 3, -1, 1.5])).toEqual([3]);
    expect(normalizeNiceClasses(null)).toEqual([]);
    expect(normalizeNiceClasses("not classes")).toEqual([]);
  });
});

describe("cleanText", () => {
  it("trims to a non-empty string or null", () => {
    expect(cleanText("  VELDANE  ")).toBe("VELDANE");
    expect(cleanText("   ")).toBeNull();
    expect(cleanText(undefined)).toBeNull();
    expect(cleanText(7)).toBeNull();
  });
});

describe("EUIPO_SOURCE.parse", () => {
  const full = {
    applicationNumber: "018455720",
    markFeature: "Word",
    wordMarkSpecification: { verbalElement: "HELIOMER" },
    niceClasses: ["3", "5"],
    status: "Registered",
    statusDate: "2021-09-21",
    applicationDate: "2021-03-04",
    registrationDate: "2021-09-15",
    expiryDate: "2031-03-04",
    applicants: [{ name: "Heliomer Pharma GmbH", countryCode: "de" }],
  };

  it("maps a full eSearch-shaped record", () => {
    const [record] = EUIPO_SOURCE.parse([full]);
    expect(record).toMatchObject({
      registry: "euipo",
      office_ref: "018455720",
      mark_text: "HELIOMER",
      mark_kind: "Word",
      nice_classes: [3, 5],
      status: "registered",
      status_raw: "Registered",
      filing_date: "2021-03-04",
      registration_date: "2021-09-15",
      expiry_date: "2031-03-04",
      owner_name: "Heliomer Pharma GmbH",
      owner_country: "DE",
      territory: ["EU"],
      office_url: "https://euipo.europa.eu/eSearch/#details/trademarks/018455720",
      source_updated_at: "2021-09-21",
    });
    expect(record.raw).toEqual(full);
  });

  it("handles purely figurative marks (no verbal element)", () => {
    const [record] = EUIPO_SOURCE.parse([
      {
        applicationNumber: "018544301",
        markFeature: "Figurative",
        wordMarkSpecification: null,
        markImageUrl: "https://euipo.europa.eu/copla/image/sample/018544301",
        niceClasses: [12, 28],
        status: "Registered",
      },
    ]);
    expect(record.mark_text).toBeNull();
    expect(record.mark_image_url).toContain("018544301");
    expect(record.registration_date).toBeNull();
  });

  it("skips payloads without the registry identifier", () => {
    expect(
      EUIPO_SOURCE.parse([{ status: "Registered" }, null, "junk", full]),
    ).toHaveLength(1);
  });
});

describe("EUIPO_SOURCE.fetchBatch (fixture mode)", () => {
  it("loads a fixture that exercises the whole pipeline", async () => {
    const payloads = await EUIPO_SOURCE.fetchBatch();
    const records = EUIPO_SOURCE.parse(payloads);
    expect(records.length).toBe(payloads.length); // every fixture row is parseable
    expect(records.length).toBeGreaterThanOrEqual(25);

    // Every normalised status appears, so seed/verify exercise them all.
    const statuses = new Set(records.map((r) => r.status));
    for (const s of ["registered", "pending", "expired", "opposed", "withdrawn"]) {
      expect(statuses, `fixture should include a ${s} mark`).toContain(s);
    }

    // Registration-date bands that keep all three radar buckets populated
    // (vulnerable: reg + 5y already passed; approaching: passes soon; watch:
    // years of room). verify-ingestion.mjs checks live bucketing in the DB.
    const registered = records.filter(
      (r) => r.status === "registered" && r.registration_date,
    );
    expect(registered.filter((r) => r.registration_date! < "2021-06-30").length)
      .toBeGreaterThanOrEqual(5);
    expect(
      registered.filter(
        (r) => r.registration_date! >= "2021-09-01" && r.registration_date! <= "2022-02-28",
      ).length,
    ).toBeGreaterThanOrEqual(5);
    expect(registered.filter((r) => r.registration_date! >= "2023-01-01").length)
      .toBeGreaterThanOrEqual(5);
  });

  it("respects the batch limit", async () => {
    expect(await EUIPO_SOURCE.fetchBatch({ limit: 3 })).toHaveLength(3);
  });
});
