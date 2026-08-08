import { describe, expect, it } from "vitest";

import { TIERS, can, type Tier } from "@/lib/tiers";

const ALL_TIERS: Tier[] = ["entry", "professional", "brand_partner", "enterprise"];

describe("tier capabilities", () => {
  it("exposes every tier in the union", () => {
    expect(Object.keys(TIERS).sort()).toEqual([...ALL_TIERS].sort());
  });

  it("returns the capability record for a tier", () => {
    expect(can("professional")).toBe(TIERS.professional);
    expect(can("professional").maxListings).toBe(5);
  });

  it("gives the free tier no listing or DM allowance", () => {
    const entry = can("entry");
    expect(entry.pricePerMonth).toBe(0);
    expect(entry.maxListings).toBe(0);
    expect(entry.weeklyDmLimit).toBe(0);
  });

  it("treats null as unlimited only on enterprise", () => {
    const unlimited = ALL_TIERS.filter(
      (t) => can(t).maxListings === null && can(t).weeklyDmLimit === null,
    );
    expect(unlimited).toEqual(["enterprise"]);
  });

  // Guards the "UI is never the security boundary" rule: paid-only capabilities
  // must never leak onto the free tier if someone edits the table.
  it("never grants paid capabilities to the entry tier", () => {
    const entry = can("entry");
    expect(entry.canSeeSellerAnalytics).toBe(false);
    expect(entry.canGetVerifiedBadge).toBe(false);
    expect(entry.fullMatchmaking).toBe(false);
  });

  it("reserves full matchmaking for enterprise", () => {
    expect(ALL_TIERS.filter((t) => can(t).fullMatchmaking)).toEqual([
      "enterprise",
    ]);
  });

  it("gives every tier a non-negative price and a label", () => {
    for (const tier of ALL_TIERS) {
      const c = can(tier);
      expect(c.label).toBeTruthy();
      expect(c.pricePerMonth).toBeGreaterThanOrEqual(0);
    }
  });
});
