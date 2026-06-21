// AUTH-GATED route — /u/[id] is sign-in-only (matches /listings; invite-only
// pre-launch). At Launch, reopen profiles + listings to anon for SEO.
// Privacy: profiles are world-readable at the row level, but the column-level
// GRANT (migration 20260621120000) hides stripe_customer_id, and we select via
// PUBLIC_PROFILE_COLUMNS so no private/account data is ever exposed.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset, PublicProfile } from "@/lib/types";
import { PUBLIC_PROFILE_COLUMNS, profileDisplayName } from "@/lib/profile";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { NexusMark } from "@/components/brand/nexus-mark";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { FollowButton } from "@/components/profile/follow-button";
import { FollowStats } from "@/components/profile/follow-stats";
import { ListingBrowseCard } from "@/components/listings/listing-browse-card";

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
  return { title: `${name} · Spiral Nexus` };
}

export default async function PublicProfilePage({
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
  const isSelf = user.id === id;

  // Follow graph: counts for this profile + whether the viewer follows them.
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", id),
  ]);
  let isFollowing = false;
  if (!isSelf) {
    const { data: edge } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", id)
      .maybeSingle();
    isFollowing = !!edge;
  }

  // Only this member's PUBLISHED listings. RLS already hides drafts from other
  // users; the explicit filter keeps it correct on your own profile too.
  const { data: published } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("owner_id", id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  const listings = (published ?? []) as IpAsset[];

  const name = profileDisplayName(profile);

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <ProfileIdentity
          profile={profile}
          stats={
            <FollowStats followers={followers ?? 0} following={following ?? 0} />
          }
          actions={
            isSelf ? (
              <Link
                href="/dashboard/profile/edit"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Pencil className="size-4" aria-hidden />
                Edit profile
              </Link>
            ) : (
              <FollowButton
                targetId={id}
                initialFollowing={isFollowing}
                size="sm"
              />
            )
          }
        />

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {isSelf ? "Your published listings" : `Listings from ${name}`}
          </h2>

          {listings.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-surface px-8 py-14 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
                <NexusMark className="size-7" />
              </span>
              <p className="mx-auto mt-4 max-w-sm text-slate-600">
                {isSelf
                  ? "You haven't published any listings yet."
                  : `${name} hasn't published any listings yet.`}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingBrowseCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
