import { describe, expect, it } from "vitest";

import { REGISTRIES, type Registry, isLandingOnly, registryUrl } from "@/lib/registries";

const withQuery: Registry = {
  id: "demo",
  name: "Demo",
  jurisdiction: "Nowhere",
  landingUrl: "https://demo.example/search",
  buildSearchUrl: (q) => `https://demo.example/search?q=${encodeURIComponent(q)}`,
  blurb: "Demo registry with a documented GET query.",
};

const landingOnly: Registry = { ...withQuery, buildSearchUrl: undefined };

describe("REGISTRIES catalogue", () => {
  it("lists the four MVP offices with unique ids", () => {
    expect(REGISTRIES.map((r) => r.id)).toEqual([
      "uspto",
      "ukipo",
      "euipo",
      "wipo",
    ]);
    expect(new Set(REGISTRIES.map((r) => r.id)).size).toBe(REGISTRIES.length);
  });

  it("points every registry at an https landing page", () => {
    for (const r of REGISTRIES) {
      expect(r.landingUrl).toMatch(/^https:\/\//);
      expect(r.name).toBeTruthy();
      expect(r.jurisdiction).toBeTruthy();
    }
  });

  // The module's whole premise: none of these offices documents a free-text GET
  // query, so we must not fabricate a pre-filled deep link for any of them.
  it("declares no search-URL builder for any real registry today", () => {
    for (const r of REGISTRIES) {
      expect(r.buildSearchUrl).toBeUndefined();
    }
  });
});

describe("registryUrl", () => {
  it("returns the landing page when the registry has no query format", () => {
    expect(registryUrl(landingOnly, "nimbus")).toBe(landingOnly.landingUrl);
  });

  it("deep-links when the registry documents a query format", () => {
    expect(registryUrl(withQuery, "nim bus")).toBe(
      "https://demo.example/search?q=nim%20bus",
    );
  });

  it("uses the landing page for an empty or whitespace-only query", () => {
    expect(registryUrl(withQuery, "")).toBe(withQuery.landingUrl);
    expect(registryUrl(withQuery, "   ")).toBe(withQuery.landingUrl);
  });

  it("trims the query before building the deep link", () => {
    expect(registryUrl(withQuery, "  nimbus  ")).toBe(
      "https://demo.example/search?q=nimbus",
    );
  });

  it("always returns an https URL for the real registries", () => {
    for (const r of REGISTRIES) {
      expect(registryUrl(r, "nimbus")).toMatch(/^https:\/\//);
    }
  });
});

describe("isLandingOnly", () => {
  // Drives the UI's "we copied your query, paste it there" affordance.
  it("is true whenever no deep link can be built", () => {
    expect(isLandingOnly(landingOnly, "nimbus")).toBe(true);
    expect(isLandingOnly(withQuery, "")).toBe(true);
    expect(isLandingOnly(withQuery, "   ")).toBe(true);
  });

  it("is false when a real deep link is available", () => {
    expect(isLandingOnly(withQuery, "nimbus")).toBe(false);
  });

  it("agrees with registryUrl for every registry", () => {
    for (const r of REGISTRIES) {
      const landing = registryUrl(r, "nimbus") === r.landingUrl;
      expect(isLandingOnly(r, "nimbus")).toBe(landing);
    }
  });
});
