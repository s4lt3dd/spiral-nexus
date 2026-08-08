import { describe, expect, it } from "vitest";

import { MEMBER_PAGE_SIZE, memberParamsSchema, searchMembers } from "@/lib/members";
import { createSupabaseMock } from "../helpers/supabase-mock";

const parse = (input: Record<string, unknown>) => memberParamsSchema.parse(input);

describe("memberParamsSchema", () => {
  it("applies defaults for a bare URL", () => {
    const p = parse({});
    expect(p.sort).toBe("newest");
    expect(p.page).toBe(1);
    expect(p.sectors).toBeUndefined();
  });

  it("accepts a fully specified query", () => {
    expect(
      parse({
        q: " ada ",
        role: "owner",
        sectors: "Automotive,Fashion & Apparel",
        country: "United Kingdom",
        sort: "name",
        page: "2",
      }),
    ).toMatchObject({
      q: "ada",
      role: "owner",
      sectors: ["Automotive", "Fashion & Apparel"],
      country: "United Kingdom",
      sort: "name",
      page: 2,
    });
  });

  it("trims whitespace around comma-separated sectors", () => {
    expect(parse({ sectors: " Automotive , Consumer Goods " }).sectors).toEqual([
      "Automotive",
      "Consumer Goods",
    ]);
  });

  // A stale or hand-edited URL must degrade gracefully, not 500 the directory.
  it("drops sector values outside the controlled vocabulary", () => {
    expect(parse({ sectors: "Automotive,Crypto,Fashion & Apparel" }).sectors).toEqual(
      ["Automotive", "Fashion & Apparel"],
    );
  });

  it("dedupes repeated sectors", () => {
    expect(parse({ sectors: "Automotive,Automotive" }).sectors).toEqual([
      "Automotive",
    ]);
  });

  it("yields an empty selection when no sector survives validation", () => {
    expect(parse({ sectors: "Crypto,Widgets" }).sectors).toEqual([]);
  });

  it("ignores an unknown role instead of failing the page", () => {
    expect(parse({ role: "broker" }).role).toBeUndefined();
  });

  it("ignores an unknown country instead of failing the page", () => {
    expect(parse({ country: "Atlantis" }).country).toBeUndefined();
  });

  it("falls back to the default sort and page for junk values", () => {
    expect(parse({ sort: "oldest" }).sort).toBe("newest");
    expect(parse({ page: "0" }).page).toBe(1);
    expect(parse({ page: "abc" }).page).toBe(1);
  });

  it("rejects an over-long search term", () => {
    expect(memberParamsSchema.safeParse({ q: "x".repeat(101) }).success).toBe(
      false,
    );
  });
});

describe("searchMembers", () => {
  const params = parse({});
  const emptyProfiles = { tables: { profiles: { data: [], count: 0 } } };

  it("returns only onboarded members", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, params);

    expect(mock.forTable("profiles")[0].allFor("not")).toContainEqual([
      "onboarded_at",
      "is",
      null,
    ]);
  });

  // Founder decision: no "Spiral Nexus member" ghosts in the directory.
  it("filters out rows with neither a display name nor an org name", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, params);

    expect(mock.forTable("profiles")[0].allFor("or")).toContainEqual([
      "display_name.not.is.null,org_name.not.is.null",
    ]);
  });

  it("selects the public column list, never a private column", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, params);

    const select = mock.forTable("profiles")[0].argsFor("select")?.[0] as string;
    expect(select).not.toContain("stripe_customer_id");
    expect(select).toContain("display_name");
  });

  it("hides the viewer from their own directory results", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, params, { excludeId: "me" });

    expect(mock.forTable("profiles")[0].allFor("neq")).toContainEqual(["id", "me"]);
  });

  it("adds no exclusion when there is no viewer", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, params, { excludeId: null });

    expect(mock.forTable("profiles")[0].allFor("neq")).toEqual([]);
  });

  // Roles use contains (must have the role); sectors use overlaps (matches ANY
  // selected sector). Swapping these silently changes what members are found.
  it("matches roles with contains and sectors with overlaps", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(
      mock.client,
      parse({ role: "owner", sectors: "Automotive,Consumer Goods" }),
    );

    const q = mock.forTable("profiles")[0];
    expect(q.allFor("contains")).toContainEqual(["role_flags", ["owner"]]);
    expect(q.allFor("overlaps")).toContainEqual([
      "sectors",
      ["Automotive", "Consumer Goods"],
    ]);
  });

  it("skips the sector filter when the selection is empty", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, parse({ sectors: "Crypto" }));

    expect(mock.forTable("profiles")[0].allFor("overlaps")).toEqual([]);
  });

  it("matches the based-in country exactly", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, parse({ country: "Japan" }));

    expect(mock.forTable("profiles")[0].allFor("eq")).toContainEqual([
      "country",
      "Japan",
    ]);
  });

  it("searches name, headline and org together", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, parse({ q: "ada" }));

    const ors = mock.forTable("profiles")[0].allFor("or").map((a) => a[0] as string);
    const search = ors.find((o) => o.includes("ilike"));
    expect(search).toContain("display_name.ilike.*ada*");
    expect(search).toContain("headline.ilike.*ada*");
    expect(search).toContain("org_name.ilike.*ada*");
  });

  it("strips PostgREST metacharacters out of the search filter", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, parse({ q: "a,b(c)*d:e&f%g" }));

    const search = mock
      .forTable("profiles")[0]
      .allFor("or")
      .map((a) => a[0] as string)
      .find((o) => o.includes("ilike")) as string;
    const term = search.split("display_name.ilike.*")[1].split("*,")[0];
    expect(term).not.toMatch(/[%,()*:&]/);
  });

  it("sorts by name when asked, newest otherwise", async () => {
    const byName = createSupabaseMock(emptyProfiles);
    await searchMembers(byName.client, parse({ sort: "name" }));
    expect(byName.forTable("profiles")[0].argsFor("order")).toEqual([
      "display_name",
      { ascending: true, nullsFirst: false },
    ]);

    const byNewest = createSupabaseMock(emptyProfiles);
    await searchMembers(byNewest.client, params);
    expect(byNewest.forTable("profiles")[0].argsFor("order")).toEqual([
      "created_at",
      { ascending: false },
    ]);
  });

  it("paginates with a MEMBER_PAGE_SIZE window", async () => {
    const mock = createSupabaseMock(emptyProfiles);
    await searchMembers(mock.client, parse({ page: "2" }));

    expect(mock.forTable("profiles")[0].argsFor("range")).toEqual([
      MEMBER_PAGE_SIZE,
      2 * MEMBER_PAGE_SIZE - 1,
    ]);
  });

  it("derives pageCount from the total count", async () => {
    const mock = createSupabaseMock({
      tables: { profiles: { data: [{ id: "a" }], count: 13 } },
    });
    const res = await searchMembers(mock.client, params);

    expect(res.count).toBe(13);
    expect(res.pageCount).toBe(Math.ceil(13 / MEMBER_PAGE_SIZE));
  });

  it("throws on a query error", async () => {
    const mock = createSupabaseMock({
      tables: { profiles: { data: null, error: new Error("nope") } },
    });
    await expect(searchMembers(mock.client, params)).rejects.toThrow("nope");
  });
});
