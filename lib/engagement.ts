// Slice D: engagement reads — like/save counts for listing surfaces, the
// viewer's recent-activity feed, and owner notifications. All queries run
// through the caller's RLS-scoped client; saved counts go through the
// aggregate-only SECURITY DEFINER function (savers are never exposed).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/types";

export interface EngagementCounts {
  likes: Map<string, number>;
  saves: Map<string, number>;
}

// Batched per page of cards — one likes query + one counts RPC, never N+1.
export async function engagementCounts(
  supabase: SupabaseClient,
  listingIds: string[],
): Promise<EngagementCounts> {
  const likes = new Map<string, number>();
  const saves = new Map<string, number>();
  if (listingIds.length === 0) return { likes, saves };

  const [likeRows, saveRows] = await Promise.all([
    supabase
      .from("listing_likes")
      .select("listing_id")
      .in("listing_id", listingIds),
    supabase.rpc("saved_counts", { listing_ids: listingIds }),
  ]);

  for (const r of likeRows.data ?? []) {
    likes.set(r.listing_id, (likes.get(r.listing_id) ?? 0) + 1);
  }
  for (const r of (saveRows.data ?? []) as { listing_id: string; saves: number }[]) {
    saves.set(r.listing_id, Number(r.saves));
  }
  return { likes, saves };
}

// Which of these listings the viewer has liked (button initial state).
export async function viewerLikedSet(
  supabase: SupabaseClient,
  userId: string,
  listingIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();
  const { data } = await supabase
    .from("listing_likes")
    .select("listing_id")
    .eq("user_id", userId)
    .in("listing_id", listingIds);
  return new Set((data ?? []).map((r) => r.listing_id));
}

// ---------------------------------------------------------------------------
// Recent activity (the VIEWER's own trail): listings they liked + members
// they followed, merged chronologically.
// ---------------------------------------------------------------------------
export type ActivityItem =
  | {
      kind: "like";
      at: string;
      listing: { id: string; title: string } | null;
    }
  | {
      kind: "follow";
      at: string;
      member: Pick<
        PublicProfile,
        "id" | "display_name" | "org_name" | "avatar_url" | "verified"
      > | null;
    };

export async function recentActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 30,
): Promise<ActivityItem[]> {
  const [likeRows, followRows] = await Promise.all([
    supabase
      .from("listing_likes")
      .select("listing_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const likes = likeRows.data ?? [];
  const follows = followRows.data ?? [];

  // Resolve referenced rows in two batched lookups. RLS hides unpublished
  // listings from the liker — those resolve to null and are dropped below.
  const [listingRows, memberRows] = await Promise.all([
    likes.length
      ? supabase
          .from("ip_assets")
          .select("id, title")
          .in("id", likes.map((l) => l.listing_id))
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    follows.length
      ? supabase
          .from("profiles")
          .select("id, display_name, org_name, avatar_url, verified")
          .in("id", follows.map((f) => f.following_id))
      : Promise.resolve({
          data: [] as Pick<
            PublicProfile,
            "id" | "display_name" | "org_name" | "avatar_url" | "verified"
          >[],
        }),
  ]);

  const listingById = new Map(
    (listingRows.data ?? []).map((l) => [l.id, l] as const),
  );
  const memberById = new Map(
    (memberRows.data ?? []).map((m) => [m.id, m] as const),
  );

  const items: ActivityItem[] = [
    ...likes.map(
      (l): ActivityItem => ({
        kind: "like",
        at: l.created_at,
        listing: listingById.get(l.listing_id) ?? null,
      }),
    ),
    ...follows.map(
      (f): ActivityItem => ({
        kind: "follow",
        at: f.created_at,
        member: memberById.get(f.following_id) ?? null,
      }),
    ),
  ]
    // Drop items whose target vanished (unpublished listing, deleted account).
    .filter((i) => (i.kind === "like" ? i.listing : i.member))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);

  return items;
}

// ---------------------------------------------------------------------------
// Notifications (things done TO the viewer): likes on their listings and new
// followers, merged chronologically.
// ---------------------------------------------------------------------------
export type NotificationItem =
  | {
      kind: "like";
      at: string;
      actor: ActorRef | null;
      listing: { id: string; title: string };
    }
  | {
      kind: "follow";
      at: string;
      actor: ActorRef | null;
    };

type ActorRef = Pick<
  PublicProfile,
  "id" | "display_name" | "org_name" | "avatar_url" | "verified"
>;

export async function recentNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 15,
): Promise<NotificationItem[]> {
  // My listings (id -> title) first; likes are then one indexed query.
  const { data: myListings } = await supabase
    .from("ip_assets")
    .select("id, title")
    .eq("owner_id", userId);
  const mine = new Map((myListings ?? []).map((l) => [l.id, l] as const));

  const [likeRows, followRows] = await Promise.all([
    mine.size
      ? supabase
          .from("listing_likes")
          .select("user_id, listing_id, created_at")
          .in("listing_id", [...mine.keys()])
          .neq("user_id", userId) // self-likes aren't news
          .order("created_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({
          data: [] as { user_id: string; listing_id: string; created_at: string }[],
        }),
    supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const likes = likeRows.data ?? [];
  const follows = followRows.data ?? [];

  const actorIds = [
    ...new Set([
      ...likes.map((l) => l.user_id),
      ...follows.map((f) => f.follower_id),
    ]),
  ];
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, org_name, avatar_url, verified")
        .in("id", actorIds)
    : { data: [] as ActorRef[] };
  const actorById = new Map((actors ?? []).map((a) => [a.id, a] as const));

  const items: NotificationItem[] = [
    ...likes.flatMap((l): NotificationItem[] => {
      const listing = mine.get(l.listing_id);
      if (!listing) return [];
      return [
        {
          kind: "like",
          at: l.created_at,
          actor: actorById.get(l.user_id) ?? null,
          listing,
        },
      ];
    }),
    ...follows.map(
      (f): NotificationItem => ({
        kind: "follow",
        at: f.created_at,
        actor: actorById.get(f.follower_id) ?? null,
      }),
    ),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);

  return items;
}

// Compact relative timestamp for activity/notification rows.
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
