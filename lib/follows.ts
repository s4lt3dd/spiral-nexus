// Follow-graph reads for the profile surfaces: follower/following counts and
// the hydrated member lists behind them. All queries run through the caller's
// RLS-scoped client — the follows SELECT policy already allows any signed-in
// member to read the graph (migration 20260621140000_follows.sql), so the
// lists are member-visible without any schema change.
//
// Pattern mirrors lib/engagement.ts: pull edge ids from `follows`, then hydrate
// identities from `profiles` in one batched lookup (never a per-row join).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/types";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/profile";

// Cap a single list page. Pre-launch volumes are tiny; the cap is a guardrail,
// and `listCount` above the cap would signal a future "load more" is due.
export const FOLLOW_LIST_LIMIT = 200;

export interface FollowCounts {
  followers: number;
  following: number;
}

// Exact follower + following counts for a profile (the tab labels + the
// clickable stats on the profile/dashboard headers). Two head-only queries.
export async function followCounts(
  supabase: SupabaseClient,
  profileId: string,
): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

// Members who follow `profileId`, most-recent first.
export async function listFollowers(
  supabase: SupabaseClient,
  profileId: string,
  limit = FOLLOW_LIST_LIMIT,
): Promise<PublicProfile[]> {
  const { data: edges } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return hydrate(supabase, (edges ?? []).map((e) => e.follower_id));
}

// Members `profileId` follows, most-recent first.
export async function listFollowing(
  supabase: SupabaseClient,
  profileId: string,
  limit = FOLLOW_LIST_LIMIT,
): Promise<PublicProfile[]> {
  const { data: edges } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return hydrate(supabase, (edges ?? []).map((e) => e.following_id));
}

// Which of `memberIds` the viewer follows — for each row's follow-button
// initial state (mirrors the batch in app/(app)/network/page.tsx).
export async function viewerFollowingSet(
  supabase: SupabaseClient,
  viewerId: string,
  memberIds: string[],
): Promise<Set<string>> {
  if (memberIds.length === 0) return new Set();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", memberIds);
  return new Set((data ?? []).map((e) => e.following_id));
}

// Resolve an ordered id list to full public profiles, preserving the input
// order and dropping any id that didn't resolve (e.g. a deleted account).
async function hydrate(
  supabase: SupabaseClient,
  ids: string[],
): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .in("id", ids);
  const byId = new Map(
    ((data ?? []) as unknown as PublicProfile[]).map((p) => [p.id, p] as const),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is PublicProfile => p !== undefined);
}
