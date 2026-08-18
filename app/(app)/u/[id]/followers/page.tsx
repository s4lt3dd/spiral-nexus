// AUTH-GATED route — /u/[id]/followers is sign-in-only, matching /u/[id] and
// the invite-only pre-launch stance. The follows graph is readable by any
// signed-in member (RLS), and identities come via PUBLIC_PROFILE_COLUMNS, so
// no private data is exposed. Reopen to anon for SEO at Launch.

import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";
import { PUBLIC_PROFILE_COLUMNS, profileDisplayName } from "@/lib/profile";
import { followCounts, listFollowers, viewerFollowingSet } from "@/lib/follows";
import { SiteHeader } from "@/components/marketing/site-header";
import { FollowListView } from "@/components/profile/follow-list-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, org_name")
    .eq("id", id)
    .maybeSingle();
  const name = data ? profileDisplayName(data) : "Member";
  return { title: `${name}'s followers · Spiral Nexus` };
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (!profileRow) notFound();
  const profile = profileRow as PublicProfile;

  const [counts, members] = await Promise.all([
    followCounts(supabase, id),
    listFollowers(supabase, id),
  ]);
  const followingIds = await viewerFollowingSet(
    supabase,
    user.id,
    members.map((m) => m.id),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />
      <FollowListView
        profile={profile}
        tab="followers"
        members={members}
        followingIds={followingIds}
        counts={counts}
        viewerId={user.id}
      />
    </div>
  );
}
