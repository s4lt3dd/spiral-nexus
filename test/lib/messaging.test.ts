import { afterEach, describe, expect, it, vi } from "vitest";

import { DAILY_NEW_CONVERSATION_CAP, weeklyDmLimit } from "@/lib/messaging";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("weeklyDmLimit", () => {
  // The monetization cap is deliberately open until Stripe ships — if this
  // starts returning 0 for `entry` while payments are off, the MVP silently
  // blocks the core loop (buyer contacts owner).
  it("is unlimited for every tier while payments are off", () => {
    vi.stubEnv("PAYMENTS_ENABLED", "false");
    expect(weeklyDmLimit("entry")).toBeNull();
    expect(weeklyDmLimit("professional")).toBeNull();
    expect(weeklyDmLimit("enterprise")).toBeNull();
  });

  it("enforces the per-tier cap once payments are on", () => {
    vi.stubEnv("PAYMENTS_ENABLED", "true");
    expect(weeklyDmLimit("entry")).toBe(0);
    expect(weeklyDmLimit("professional")).toBe(5);
    expect(weeklyDmLimit("brand_partner")).toBe(5);
    expect(weeklyDmLimit("enterprise")).toBeNull();
  });
});

describe("DAILY_NEW_CONVERSATION_CAP", () => {
  // Anti-spam hygiene, always on. It must sit well above honest use so it
  // never becomes a de-facto monetization limit.
  it("is a positive cap well above normal usage", () => {
    expect(DAILY_NEW_CONVERSATION_CAP).toBeGreaterThan(10);
    expect(Number.isInteger(DAILY_NEW_CONVERSATION_CAP)).toBe(true);
  });
});
