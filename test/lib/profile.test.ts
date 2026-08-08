import { describe, expect, it } from "vitest";

import {
  NICE_CLASSES,
  PROFILE_ROLES,
  PUBLIC_PROFILE_COLUMNS,
  ROLE_VALUES,
  niceClassLabel,
  profileCompleteness,
  profileDisplayName,
  profileInitials,
  roleLabel,
} from "@/lib/profile";

const EMPTY_PROFILE = {
  display_name: null,
  org_name: null,
  headline: null,
  bio: null,
  avatar_url: null,
  location: null,
  role_flags: [],
  sectors: [],
  jurisdictions: [],
};

describe("PUBLIC_PROFILE_COLUMNS", () => {
  // Mirrors the column-level GRANT. A private column leaking in here would be
  // selected by every profile read in the app.
  it("never includes private columns", () => {
    expect(PUBLIC_PROFILE_COLUMNS).not.toContain("stripe_customer_id");
  });

  it("includes the columns the directory and cards render", () => {
    for (const col of ["display_name", "org_name", "avatar_url", "verified"]) {
      expect(PUBLIC_PROFILE_COLUMNS).toContain(col);
    }
  });
});

describe("profileDisplayName", () => {
  it("prefers the personal display name", () => {
    expect(
      profileDisplayName({ display_name: "Ada Lovelace", org_name: "Analytical" }),
    ).toBe("Ada Lovelace");
  });

  it("falls back to the org name", () => {
    expect(profileDisplayName({ display_name: null, org_name: "Acme IP" })).toBe(
      "Acme IP",
    );
  });

  it("treats a whitespace-only name as missing", () => {
    expect(
      profileDisplayName({ display_name: "   ", org_name: "Acme IP" }),
    ).toBe("Acme IP");
  });

  it("falls back to the generic placeholder when both are missing", () => {
    expect(profileDisplayName({ display_name: null, org_name: null })).toBe(
      "Spiral Nexus member",
    );
  });
});

describe("profileInitials", () => {
  it("uses first and last initials of a two-part name", () => {
    expect(
      profileInitials({ display_name: "Ada Lovelace", org_name: null }),
    ).toBe("AL");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(profileInitials({ display_name: "Ada", org_name: null })).toBe("AD");
  });

  it("collapses extra whitespace instead of producing a blank initial", () => {
    expect(
      profileInitials({ display_name: "  Ada   Lovelace ", org_name: null }),
    ).toBe("AL");
  });

  it("derives initials from the org name when there is no personal name", () => {
    expect(profileInitials({ display_name: null, org_name: "Acme IP" })).toBe(
      "AI",
    );
  });

  it("never returns an empty monogram", () => {
    expect(
      profileInitials({ display_name: null, org_name: null }).length,
    ).toBeGreaterThan(0);
  });
});

describe("profileCompleteness", () => {
  it("reports 0% and lists every step for a blank profile", () => {
    const r = profileCompleteness(EMPTY_PROFILE);
    expect(r.percent).toBe(0);
    expect(r.completed).toBe(0);
    expect(r.missing).toHaveLength(r.total);
  });

  it("reports 100% with nothing missing when every field is filled", () => {
    const r = profileCompleteness({
      display_name: "Ada Lovelace",
      org_name: "Analytical",
      headline: "IP counsel",
      bio: "Twenty years in trademarks.",
      avatar_url: "https://example.com/a.png",
      location: "London",
      role_flags: ["owner"],
      sectors: ["Automotive"],
      jurisdictions: ["United Kingdom"],
    });
    expect(r.percent).toBe(100);
    expect(r.completed).toBe(r.total);
    expect(r.missing).toEqual([]);
  });

  it("does not count whitespace-only text as completed", () => {
    const r = profileCompleteness({ ...EMPTY_PROFILE, headline: "   " });
    expect(r.percent).toBe(0);
    expect(r.missing.map((m) => m.key)).toContain("headline");
  });

  it("does not count an empty array as a completed multi-select", () => {
    const r = profileCompleteness({ ...EMPTY_PROFILE, sectors: [] });
    expect(r.missing.map((m) => m.key)).toContain("sectors");
  });

  // The columns are typed non-null, but a legacy row can still carry NULL.
  // The helper guards for it, so the guard is worth pinning.
  it("survives null array columns from a legacy row", () => {
    const legacy = {
      ...EMPTY_PROFILE,
      role_flags: null,
      sectors: null,
      jurisdictions: null,
    } as unknown as Parameters<typeof profileCompleteness>[0];

    const r = profileCompleteness(legacy);
    expect(r.percent).toBe(0);
    expect(r.missing.map((m) => m.key)).toEqual(
      expect.arrayContaining(["role_flags", "sectors", "jurisdictions"]),
    );
  });

  it("counts partial progress and rounds to a whole percent", () => {
    const r = profileCompleteness({
      ...EMPTY_PROFILE,
      display_name: "Ada",
      headline: "IP counsel",
    });
    expect(r.completed).toBe(2);
    expect(r.percent).toBe(Math.round((2 / r.total) * 100));
    expect(Number.isInteger(r.percent)).toBe(true);
  });

  it("gives every missing step a key and a human label", () => {
    for (const m of profileCompleteness(EMPTY_PROFILE).missing) {
      expect(m.key).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });
});

describe("roleLabel", () => {
  it("labels every declared role", () => {
    for (const role of PROFILE_ROLES) {
      expect(roleLabel(role.value)).toBe(role.label);
    }
  });

  it("echoes an unknown role rather than rendering 'undefined'", () => {
    expect(roleLabel("broker")).toBe("broker");
  });

  it("keeps ROLE_VALUES in sync with PROFILE_ROLES", () => {
    expect(ROLE_VALUES).toEqual(PROFILE_ROLES.map((r) => r.value));
  });
});

describe("niceClassLabel", () => {
  it("labels a known class", () => {
    expect(niceClassLabel(25)).toBe("Clothing & footwear");
  });

  it("falls back to 'Class n' outside 1–45", () => {
    expect(niceClassLabel(99)).toBe("Class 99");
  });

  it("covers all 45 classes exactly once", () => {
    expect(NICE_CLASSES).toHaveLength(45);
    expect(new Set(NICE_CLASSES.map((c) => c.value)).size).toBe(45);
  });
});
