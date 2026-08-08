import { describe, expect, it } from "vitest";

import {
  NICE_CLASSES,
  PAGE_SIZE,
  discoveryParamsSchema,
  niceClassLabel,
  niceClassesLabel,
  searchListings,
} from "@/lib/discovery";
import { createSupabaseMock } from "../helpers/supabase-mock";

const parse = (input: Record<string, unknown>) =>
  discoveryParamsSchema.parse(input);

describe("discoveryParamsSchema", () => {
  it("applies defaults for a bare URL", () => {
    const p = parse({});
    expect(p.sort).toBe("newest");
    expect(p.page).toBe(1);
    expect(p.q).toBeUndefined();
    expect(p.nice_class).toBeUndefined();
  });

  it("accepts a fully specified query", () => {
    expect(
      parse({
        q: "  nimbus  ",
        nice_class: "9",
        jurisdiction: "United Kingdom",
        deal_type: "license",
        sort: "price_asc",
        page: "3",
      }),
    ).toMatchObject({
      q: "nimbus",
      nice_class: 9,
      jurisdiction: "United Kingdom",
      deal_type: "license",
      sort: "price_asc",
      page: 3,
    });
  });

  it("treats empty strings as absent filters", () => {
    const p = parse({ q: "   ", jurisdiction: "", deal_type: "" });
    expect(p.q).toBeUndefined();
    expect(p.jurisdiction).toBeUndefined();
    expect(p.deal_type).toBeUndefined();
  });

  // A hand-edited URL must degrade, not 500 the browse page.
  it("falls back to the default sort for an unknown sort value", () => {
    expect(parse({ sort: "cheapest" }).sort).toBe("newest");
  });

  it("falls back to page 1 for junk or out-of-range pages", () => {
    expect(parse({ page: "0" }).page).toBe(1);
    expect(parse({ page: "-4" }).page).toBe(1);
    expect(parse({ page: "abc" }).page).toBe(1);
    expect(parse({ page: "2.5" }).page).toBe(1);
  });

  it("rejects a Nice class outside 1–45", () => {
    expect(discoveryParamsSchema.safeParse({ nice_class: "0" }).success).toBe(
      false,
    );
    expect(discoveryParamsSchema.safeParse({ nice_class: "46" }).success).toBe(
      false,
    );
    expect(discoveryParamsSchema.safeParse({ nice_class: "abc" }).success).toBe(
      false,
    );
  });

  it("rejects an over-long search term", () => {
    expect(
      discoveryParamsSchema.safeParse({ q: "x".repeat(101) }).success,
    ).toBe(false);
    expect(discoveryParamsSchema.safeParse({ q: "x".repeat(100) }).success).toBe(
      true,
    );
  });

  it("rejects an unknown deal type", () => {
    expect(
      discoveryParamsSchema.safeParse({ deal_type: "auction" }).success,
    ).toBe(false);
  });
});

describe("niceClassLabel / niceClassesLabel", () => {
  it("renders 'n — label' for a known class", () => {
    expect(niceClassLabel(9)).toBe("9 — Electronics & software");
  });

  it("renders just the number for an unknown class", () => {
    expect(niceClassLabel(99)).toBe("99");
  });

  it("returns null for null/undefined", () => {
    expect(niceClassLabel(null)).toBeNull();
    expect(niceClassLabel(undefined)).toBeNull();
  });

  it("joins multiple classes with a separator", () => {
    expect(niceClassesLabel([9, 25])).toBe(
      "9 — Electronics & software · 25 — Clothing & footwear",
    );
  });

  it("returns null for an empty or missing class list", () => {
    expect(niceClassesLabel([])).toBeNull();
    expect(niceClassesLabel(null)).toBeNull();
    expect(niceClassesLabel(undefined)).toBeNull();
  });

  it("covers all 45 classes", () => {
    expect(NICE_CLASSES).toHaveLength(45);
  });
});

describe("searchListings", () => {
  const params = parse({});

  it("only ever returns published listings", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, params);

    const q = mock.forTable("ip_assets")[0];
    expect(q.allFor("eq")).toContainEqual(["is_published", true]);
  });

  // Private/detail-only columns must not ship in every browse response —
  // certificate_path is a private storage path.
  it("selects card columns only, never the private certificate path", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, params);

    const select = mock.forTable("ip_assets")[0].argsFor("select")?.[0] as string;
    expect(select).toContain("title");
    expect(select).not.toContain("certificate_path");
    expect(select).not.toContain("encumbrances");
    expect(select).not.toContain("quality_control");
  });

  it("paginates with a PAGE_SIZE window based on the requested page", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, parse({ page: "3" }));

    expect(mock.forTable("ip_assets")[0].argsFor("range")).toEqual([
      2 * PAGE_SIZE,
      3 * PAGE_SIZE - 1,
    ]);
  });

  it("excludes the viewer's own listings when asked", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, params, "owner-1");

    expect(mock.forTable("ip_assets")[0].allFor("neq")).toContainEqual([
      "owner_id",
      "owner-1",
    ]);
  });

  it("does not add an owner filter when there is no viewer", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, params, null);

    expect(mock.forTable("ip_assets")[0].allFor("neq")).toEqual([]);
  });

  it("applies Nice class, jurisdiction and deal-type filters", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(
      mock.client,
      parse({ nice_class: "9", jurisdiction: "United Kingdom", deal_type: "sale" }),
    );

    const q = mock.forTable("ip_assets")[0];
    expect(q.allFor("contains")).toContainEqual(["nice_classes", [9]]);
    expect(q.allFor("eq")).toContainEqual(["jurisdiction", "United Kingdom"]);
    expect(q.allFor("eq")).toContainEqual(["deal_type", "sale"]);
  });

  it("builds a prefix full-text query plus a fuzzy title match", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, parse({ q: "nim cloud" }));

    const or = mock.forTable("ip_assets")[0].argsFor("or")?.[0] as string;
    expect(or).toContain("search.fts(english).nim:*&cloud:*");
    expect(or).toContain("title.ilike.*nim cloud*");
  });

  // The search term goes straight into a PostgREST filter string, so the
  // metacharacters that could break out of it must be stripped.
  it("strips PostgREST metacharacters out of the fuzzy filter", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, parse({ q: "a,b(c)*d:e&f%g" }));

    const or = mock.forTable("ip_assets")[0].argsFor("or")?.[0] as string;
    const ilike = or.split("title.ilike.")[1];
    expect(ilike.slice(1, -1)).not.toMatch(/[%,()*:&]/);
  });

  it("drops a term with no alphanumerics from the FTS branch", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, parse({ q: "!!!" }));

    const or = mock.forTable("ip_assets")[0].argsFor("or")?.[0] as string;
    expect(or).not.toContain("search.fts");
    expect(or).toContain("title.ilike");
  });

  it("orders by price ascending with nulls last for price_asc", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, parse({ sort: "price_asc" }));

    expect(mock.forTable("ip_assets")[0].argsFor("order")).toEqual([
      "asking_price",
      { ascending: true, nullsFirst: false },
    ]);
  });

  it("orders by newest by default", async () => {
    const mock = createSupabaseMock({ tables: { ip_assets: { data: [], count: 0 } } });
    await searchListings(mock.client, params);

    expect(mock.forTable("ip_assets")[0].argsFor("order")).toEqual([
      "created_at",
      { ascending: false },
    ]);
  });

  it("derives pageCount from the total count", async () => {
    const mock = createSupabaseMock({
      tables: { ip_assets: { data: [{ id: "a" }], count: 25 } },
    });
    const res = await searchListings(mock.client, params);

    expect(res.count).toBe(25);
    expect(res.pageCount).toBe(Math.ceil(25 / PAGE_SIZE));
    expect(res.rows).toHaveLength(1);
  });

  it("reports at least one page when there are no results", async () => {
    const mock = createSupabaseMock({
      tables: { ip_assets: { data: [], count: 0 } },
    });
    const res = await searchListings(mock.client, params);

    expect(res.pageCount).toBe(1);
    expect(res.rows).toEqual([]);
  });

  it("treats a missing count as zero rather than NaN", async () => {
    const mock = createSupabaseMock({
      tables: { ip_assets: { data: [], count: null } },
    });
    const res = await searchListings(mock.client, params);

    expect(res.count).toBe(0);
    expect(res.pageCount).toBe(1);
  });

  it("throws on a query error instead of rendering an empty page", async () => {
    const mock = createSupabaseMock({
      tables: { ip_assets: { data: null, error: new Error("boom") } },
    });
    await expect(searchListings(mock.client, params)).rejects.toThrow("boom");
  });
});
