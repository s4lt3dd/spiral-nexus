import { describe, expect, it } from "vitest";

import {
  followCounts,
  listFollowers,
  listFollowing,
  viewerFollowingSet,
} from "@/lib/follows";
import { createSupabaseMock } from "../helpers/supabase-mock";

describe("followCounts", () => {
  it("returns the follower and following counts from two scoped queries", async () => {
    // Both count queries hit `follows`; branch on the eq column so the
    // followers query (following_id = P) and the following query
    // (follower_id = P) resolve to different counts.
    const mock = createSupabaseMock({
      tables: {
        follows: (q) => {
          const col = q.argsFor("eq")?.[0];
          return { count: col === "following_id" ? 3 : 7, data: [] };
        },
      },
    });

    const counts = await followCounts(mock.client, "P");

    expect(counts).toEqual({ followers: 3, following: 7 });
    // head-only counts: two queries, each selecting with a count option.
    expect(mock.forTable("follows")).toHaveLength(2);
  });

  it("coerces null counts to zero", async () => {
    const mock = createSupabaseMock({
      tables: { follows: { count: null, data: [] } },
    });
    expect(await followCounts(mock.client, "P")).toEqual({
      followers: 0,
      following: 0,
    });
  });
});

describe("listFollowers", () => {
  it("hydrates followers and preserves follow-recency order", async () => {
    const mock = createSupabaseMock({
      tables: {
        follows: {
          data: [
            { follower_id: "U2", created_at: "2026-08-02T00:00:00Z" },
            { follower_id: "U1", created_at: "2026-08-01T00:00:00Z" },
          ],
        },
        // profiles come back in a different order than the edges…
        profiles: { data: [{ id: "U1" }, { id: "U2" }] },
      },
    });

    const members = await listFollowers(mock.client, "P");

    // …the edge order (U2 then U1) is what the list preserves.
    expect(members.map((m) => m.id)).toEqual(["U2", "U1"]);

    // Followers = who points AT P: filter on following_id.
    expect(mock.forTable("follows")[0].argsFor("eq")).toEqual([
      "following_id",
      "P",
    ]);
    // One batched hydrate, never N+1.
    expect(mock.forTable("profiles")).toHaveLength(1);
    expect(mock.forTable("profiles")[0].argsFor("in")).toEqual([
      "id",
      ["U2", "U1"],
    ]);
  });

  it("drops an edge whose profile no longer resolves (deleted account)", async () => {
    const mock = createSupabaseMock({
      tables: {
        follows: {
          data: [
            { follower_id: "GONE", created_at: "2026-08-02T00:00:00Z" },
            { follower_id: "U1", created_at: "2026-08-01T00:00:00Z" },
          ],
        },
        profiles: { data: [{ id: "U1" }] },
      },
    });

    const members = await listFollowers(mock.client, "P");
    expect(members.map((m) => m.id)).toEqual(["U1"]);
  });

  it("short-circuits with no hydrate query when there are no followers", async () => {
    const mock = createSupabaseMock({
      tables: { follows: { data: [] } },
    });
    expect(await listFollowers(mock.client, "P")).toEqual([]);
    expect(mock.forTable("profiles")).toHaveLength(0);
  });
});

describe("listFollowing", () => {
  it("scopes to who P follows (follower_id = P)", async () => {
    const mock = createSupabaseMock({
      tables: {
        follows: {
          data: [{ following_id: "U9", created_at: "2026-08-01T00:00:00Z" }],
        },
        profiles: { data: [{ id: "U9" }] },
      },
    });

    const members = await listFollowing(mock.client, "P");

    expect(members.map((m) => m.id)).toEqual(["U9"]);
    expect(mock.forTable("follows")[0].argsFor("eq")).toEqual([
      "follower_id",
      "P",
    ]);
  });
});

describe("viewerFollowingSet", () => {
  it("returns an empty set and issues no query for no ids", async () => {
    const mock = createSupabaseMock();
    expect((await viewerFollowingSet(mock.client, "me", [])).size).toBe(0);
    expect(mock.queries).toHaveLength(0);
  });

  it("returns only the ids the viewer follows, scoped to the viewer", async () => {
    const mock = createSupabaseMock({
      tables: { follows: { data: [{ following_id: "U1" }] } },
    });

    const set = await viewerFollowingSet(mock.client, "me", ["U1", "U2"]);

    expect(set.has("U1")).toBe(true);
    expect(set.has("U2")).toBe(false);
    expect(mock.forTable("follows")[0].allFor("eq")).toContainEqual([
      "follower_id",
      "me",
    ]);
  });
});
