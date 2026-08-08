import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  MVP_LISTING_ALLOWANCE,
  dealTypeLabel,
  formatPrice,
  listingAllowance,
  paymentsEnabled,
  renewalLabel,
  statusLabel,
  statusPillVariant,
} from "@/lib/listings";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("statusLabel", () => {
  it("maps known trademark statuses to their label", () => {
    expect(statusLabel("registered")).toBe("Registered");
    expect(statusLabel("opposed")).toBe("Opposed");
  });

  it("passes an unknown status through rather than dropping it", () => {
    expect(statusLabel("granted")).toBe("granted");
  });

  it("returns null for a null status", () => {
    expect(statusLabel(null)).toBeNull();
  });
});

describe("dealTypeLabel", () => {
  it("maps known deal types", () => {
    expect(dealTypeLabel("both")).toBe("License or sale");
  });

  it("falls back to the raw value when unknown", () => {
    expect(dealTypeLabel("barter")).toBe("barter");
  });
});

describe("formatPrice", () => {
  it("formats in the listing currency with no minor units", () => {
    expect(formatPrice(1000, "GBP")).toBe("£1,000");
    expect(formatPrice(2500, "EUR")).toBe("€2,500");
  });

  it("rounds away fractional pence rather than showing them", () => {
    expect(formatPrice(1234.56, "GBP")).toBe("£1,235");
  });

  it("falls back to GBP when the row has no currency", () => {
    expect(formatPrice(1000, null)).toBe(formatPrice(1000, DEFAULT_CURRENCY));
  });

  it("formats zero rather than treating it as missing", () => {
    expect(formatPrice(0, "GBP")).toBe("£0");
  });

  // The DB column is only CHECK-constrained to /^[A-Z]{3}$/, so a value Intl
  // rejects must degrade instead of throwing during render.
  it("degrades to a bare code prefix when Intl rejects the code", () => {
    expect(formatPrice(1000, "!!")).toBe("!! 1,000");
  });

  it("formats every curated currency without throwing", () => {
    for (const c of CURRENCIES) {
      expect(() => formatPrice(1500, c.value)).not.toThrow();
      expect(formatPrice(1500, c.value)).toContain("1,500");
    }
  });
});

describe("renewalLabel", () => {
  it("renders both sides of the tri-state", () => {
    expect(renewalLabel(true)).toBe("Open to renewal");
    expect(renewalLabel(false)).toBe("Not open to renewal");
  });

  // null means "unspecified" — the detail page must show nothing, not "No".
  it("returns null when unspecified", () => {
    expect(renewalLabel(null)).toBeNull();
  });
});

describe("statusPillVariant", () => {
  it("maps each status to its badge variant", () => {
    expect(statusPillVariant("registered")).toBe("brand");
    expect(statusPillVariant("pending")).toBe("warning");
    expect(statusPillVariant("opposed")).toBe("destructive");
    expect(statusPillVariant("expired")).toBe("slate");
  });

  it("falls back to slate for unknown and null", () => {
    expect(statusPillVariant("mystery")).toBe("slate");
    expect(statusPillVariant(null)).toBe("slate");
  });
});

describe("listing allowance policy", () => {
  it("is off unless PAYMENTS_ENABLED is exactly 'true'", () => {
    vi.stubEnv("PAYMENTS_ENABLED", undefined);
    expect(paymentsEnabled()).toBe(false);

    vi.stubEnv("PAYMENTS_ENABLED", "1");
    expect(paymentsEnabled()).toBe(false);

    vi.stubEnv("PAYMENTS_ENABLED", "TRUE");
    expect(paymentsEnabled()).toBe(false);

    vi.stubEnv("PAYMENTS_ENABLED", "true");
    expect(paymentsEnabled()).toBe(true);
  });

  it("grants every tier the flat MVP allowance while payments are off", () => {
    vi.stubEnv("PAYMENTS_ENABLED", "false");
    expect(listingAllowance("entry")).toBe(MVP_LISTING_ALLOWANCE);
    expect(listingAllowance("enterprise")).toBe(MVP_LISTING_ALLOWANCE);
  });

  it("switches to the canonical per-tier caps once payments are on", () => {
    vi.stubEnv("PAYMENTS_ENABLED", "true");
    expect(listingAllowance("entry")).toBe(0);
    expect(listingAllowance("professional")).toBe(5);
    expect(listingAllowance("enterprise")).toBeNull(); // unlimited
  });
});
