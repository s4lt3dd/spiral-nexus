import { describe, expect, it } from "vitest";

import {
  engagementCounts,
  recentActivity,
  recentNotifications,
  timeAgo,
  viewerLikedSet,
} from "@/lib/engagement";
import { createSupabaseMock } from "../helpers/supabase-mock";

const NOW = Date.parse("2026-08-08T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("timeAgo", () => {
  it("says 'just now' under a minute", () => {
    expect(timeAgo(ago(0), NOW)).toBe("just now");
    expect(timeAgo(ago(59 * SEC), NOW)).toBe("just now");
  });

  it("steps up through minutes, hours, days, months and years", () => {
    expect(timeAgo(ago(MIN), NOW)).toBe("1m ago");
    expect(timeAgo(ago(59 * MIN), NOW)).toBe("59m ago");
    expect(timeAgo(ago(HOUR), NOW)).toBe("1h ago");
    expect(timeAgo(ago(23 * HOUR), NOW)).toBe("23h ago");
    expect(timeAgo(ago(DAY), NOW)).toBe("1d ago");
    expect(timeAgo(ago(29 * DAY), NOW)).toBe("29d ago");
    expect(timeAgo(ago(30 * DAY), NOW)).toBe("1mo ago");
    expect(timeAgo(ago(359 * DAY), NOW)).toBe("11mo ago");
    // 12 * 30d is the roll-over point into years.
    expect(timeAgo(ago(360 * DAY), NOW)).toBe("1y ago");
    expect(timeAgo(ago(365 * DAY), NOW)).toBe("1y ago");
  });

  // Clock skew between the DB and the browser must not render "-3m ago".
  it("clamps a future timestamp to 'just now'", () => {
    expect(timeAgo(new Date(NOW + HOUR).toISOString(), NOW)).toBe("just now");
  });
});

describe("engagementCounts", () => {
  it("short-circuits with no listing ids and issues no query", async () => {
    const mock = createSupabaseMock();
    const res = await engagementCounts(mock.client, []);

    expect(res.likes.size).toBe(0);
    expect(res.saves.size).toBe(0);
    expect(mock.queries).toHaveLength(0);
  });

  it("tallies likes per listing and reads saves from the aggregate RPC", async () => {
    const mock = createSupabaseMock({
      tables: {
        listing_likes: {
          data: [
            { listing_id: "a" },
            { listing_id: "a" },
            { listing_id: "b" },
          ],
        },
      },
      rpc: {
        saved_counts: { data: [{ listing_id: "a", saves: 4 }] },
      },
    });

    const res = await engagementCounts(mock.client, ["a", "b"]);

    expect(res.likes.get("a")).toBe(2);
    expect(res.likes.get("b")).toBe(1);
    expect(res.saves.get("a")).toBe(4);
  });

  // Savers must never be exposed — saves come from the SECURITY DEFINER
  // aggregate, not from selecting the saves table.
  it("never selects the saves table directly", async () => {
    const mock = createSupabaseMock({
      rpc: { saved_counts: { data: [] } },
    });
    await engagementCounts(mock.client, ["a"]);

    expect(mock.queries.map((q) => q.table)).not.toContain("listing_saves");
    expect(mock.rpcCalls).toEqual([
      { fn: "saved_counts", args: { listing_ids: ["a"] } },
    ]);
  });

  it("batches all ids into one query, never N+1", async () => {
    const mock = createSupabaseMock({
      tables: { listing_likes: { data: [] } },
      rpc: { saved_counts: { data: [] } },
    });
    await engagementCounts(mock.client, ["a", "b", "c"]);

    expect(mock.forTable("listing_likes")).toHaveLength(1);
    expect(mock.forTable("listing_likes")[0].argsFor("in")).toEqual([
      "listing_id",
      ["a", "b", "c"],
    ]);
    expect(mock.rpcCalls).toHaveLength(1);
  });

  it("leaves a listing absent from the maps when it has no engagement", async () => {
    const mock = createSupabaseMock({
      tables: { listing_likes: { data: [] } },
      rpc: { saved_counts: { data: [] } },
    });
    const res = await engagementCounts(mock.client, ["a"]);

    expect(res.likes.get("a")).toBeUndefined();
    expect(res.saves.get("a")).toBeUndefined();
  });
});

describe("viewerLikedSet", () => {
  it("returns an empty set and issues no query for no ids", async () => {
    const mock = createSupabaseMock();
    expect((await viewerLikedSet(mock.client, "me", [])).size).toBe(0);
    expect(mock.queries).toHaveLength(0);
  });

  it("scopes the lookup to the viewer", async () => {
    const mock = createSupabaseMock({
      tables: { listing_likes: { data: [{ listing_id: "a" }] } },
    });
    const set = await viewerLikedSet(mock.client, "me", ["a", "b"]);

    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(false);
    expect(mock.forTable("listing_likes")[0].allFor("eq")).toContainEqual([
      "user_id",
      "me",
    ]);
  });
});

describe("recentActivity", () => {
  const base = {
    listing_likes: { data: [{ listing_id: "L1", created_at: ago(HOUR) }] },
    follows: { data: [{ following_id: "U1", created_at: ago(2 * HOUR) }] },
    ip_assets: { data: [{ id: "L1", title: "Nimbus" }] },
    profiles: {
      data: [
        {
          id: "U1",
          display_name: "Ada",
          org_name: null,
          avatar_url: null,
          verified: false,
        },
      ],
    },
  };

  it("merges likes and follows newest-first", async () => {
    const mock = createSupabaseMock({ tables: base });
    const items = await recentActivity(mock.client, "me");

    expect(items.map((i) => i.kind)).toEqual(["like", "follow"]);
    expect(items[0].at > items[1].at).toBe(true);
  });

  it("resolves the referenced listing and member", async () => {
    const mock = createSupabaseMock({ tables: base });
    const [like, follow] = await recentActivity(mock.client, "me");

    expect(like.kind === "like" && like.listing?.title).toBe("Nimbus");
    expect(follow.kind === "follow" && follow.member?.display_name).toBe("Ada");
  });

  // RLS hides an unpublished listing from the liker; the row must vanish from
  // the feed rather than render as a broken "liked (null)" entry.
  it("drops items whose target is no longer visible", async () => {
    const mock = createSupabaseMock({
      tables: { ...base, ip_assets: { data: [] }, profiles: { data: [] } },
    });
    expect(await recentActivity(mock.client, "me")).toEqual([]);
  });

  it("skips the resolve queries entirely when there is no activity", async () => {
    const mock = createSupabaseMock({
      tables: { listing_likes: { data: [] }, follows: { data: [] } },
    });
    const items = await recentActivity(mock.client, "me");

    expect(items).toEqual([]);
    expect(mock.forTable("ip_assets")).toHaveLength(0);
    expect(mock.forTable("profiles")).toHaveLength(0);
  });

  it("honours the limit after merging both sources", async () => {
    const mock = createSupabaseMock({
      tables: {
        listing_likes: {
          data: [
            { listing_id: "L1", created_at: ago(HOUR) },
            { listing_id: "L1", created_at: ago(3 * HOUR) },
          ],
        },
        follows: { data: [{ following_id: "U1", created_at: ago(2 * HOUR) }] },
        ip_assets: base.ip_assets,
        profiles: base.profiles,
      },
    });
    const items = await recentActivity(mock.client, "me", 2);

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.kind)).toEqual(["like", "follow"]);
  });
});

describe("recentNotifications", () => {
  const myListings = { data: [{ id: "L1", title: "Nimbus" }] };
  const actor = {
    id: "U1",
    display_name: "Ada",
    org_name: null,
    avatar_url: null,
    verified: true,
  };

  it("reports likes on my listings and new followers, newest-first", async () => {
    const mock = createSupabaseMock({
      tables: {
        ip_assets: myListings,
        listing_likes: {
          data: [{ user_id: "U1", listing_id: "L1", created_at: ago(MIN) }],
        },
        follows: { data: [{ follower_id: "U1", created_at: ago(HOUR) }] },
        profiles: { data: [actor] },
      },
    });
    const items = await recentNotifications(mock.client, "me");

    expect(items.map((i) => i.kind)).toEqual(["like", "follow"]);
    expect(items[0].actor?.display_name).toBe("Ada");
    expect(items[0].kind === "like" && items[0].listing.title).toBe("Nimbus");
  });

  it("excludes self-likes — your own like is not news", async () => {
    const mock = createSupabaseMock({
      tables: {
        ip_assets: myListings,
        listing_likes: { data: [] },
        follows: { data: [] },
      },
    });
    await recentNotifications(mock.client, "me");

    expect(mock.forTable("listing_likes")[0].allFor("neq")).toContainEqual([
      "user_id",
      "me",
    ]);
  });

  it("skips the likes query when I own no listings", async () => {
    const mock = createSupabaseMock({
      tables: {
        ip_assets: { data: [] },
        follows: { data: [] },
      },
    });
    const items = await recentNotifications(mock.client, "me");

    expect(items).toEqual([]);
    expect(mock.forTable("listing_likes")).toHaveLength(0);
  });

  it("drops a like whose listing is not mine", async () => {
    const mock = createSupabaseMock({
      tables: {
        ip_assets: myListings,
        listing_likes: {
          data: [{ user_id: "U1", listing_id: "OTHER", created_at: ago(MIN) }],
        },
        follows: { data: [] },
        profiles: { data: [actor] },
      },
    });
    expect(await recentNotifications(mock.client, "me")).toEqual([]);
  });

  it("keeps a follow whose actor profile could not be resolved", async () => {
    const mock = createSupabaseMock({
      tables: {
        ip_assets: { data: [] },
        follows: { data: [{ follower_id: "GONE", created_at: ago(MIN) }] },
        profiles: { data: [] },
      },
    });
    const items = await recentNotifications(mock.client, "me");

    expect(items).toHaveLength(1);
    expect(items[0].actor).toBeNull();
  });
});
