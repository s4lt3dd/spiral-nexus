import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, List, MessagesSquare, Pencil, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset, PublicProfile } from "@/lib/types";
import { PUBLIC_PROFILE_COLUMNS, profileCompleteness } from "@/lib/profile";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { NexusMark } from "@/components/brand/nexus-mark";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { FollowStats } from "@/components/profile/follow-stats";
import { ProfileNudge } from "@/components/profile/profile-nudge";
import { ListingBrowseCard } from "@/components/listings/listing-browse-card";

export const metadata = { title: "Your profile · Spiral Nexus" };

// The logged-in home IS the user's profile: identity, a completeness nudge,
// their published listings, and quick links. Listings management lives at
// /dashboard/listings.
export default async function ProfileHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Read own profile via the public column list (never selects stripe_*).
  const { data: profileRow } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  // First sign-in: no profile yet onboarded -> guide through onboarding.
  if (profileRow && profileRow.onboarded_at === null) redirect("/onboarding");

  const profile = profileRow as PublicProfile | null;
  const completeness = profile
    ? profileCompleteness(profile)
    : { percent: 0, completed: 0, total: 8, missing: [] };

  const { data: published } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  const listings = (published ?? []) as IpAsset[];

  // Your own follower/following counts.
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id),
  ]);

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        {profile && <ProfileNudge result={completeness} />}

        {profile && (
          <div className="mt-6">
            <ProfileIdentity
              profile={profile}
              stats={
                <FollowStats
                  followers={followers ?? 0}
                  following={following ?? 0}
                />
              }
              actions={
                <>
                  <Link
                    href="/dashboard/profile/edit"
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Edit profile
                  </Link>
                  <Link
                    href={`/u/${user.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    View public profile
                  </Link>
                </>
              }
            />
          </div>
        )}

        {/* Quick links */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/listings"
            className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-text">
              <List className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-medium text-foreground">My listings</span>
              <span className="block text-sm text-slate-500">
                Create, edit, and publish your marks
              </span>
            </span>
          </Link>
          <Link
            href="/messages"
            className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-text">
              <MessagesSquare className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-medium text-foreground">Messages</span>
              <span className="block text-sm text-slate-500">
                Conversations with buyers and owners
              </span>
            </span>
          </Link>
        </div>

        {/* Published listings */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Your published listings
            </h2>
            {listings.length > 0 && (
              <Link
                href="/dashboard/listings"
                className="text-sm font-medium text-brand-text hover:underline"
              >
                Manage all
              </Link>
            )}
          </div>

          {listings.length === 0 ? (
            <div className="animate-rise relative mt-5 overflow-hidden rounded-xl border border-border bg-surface px-8 py-14 text-center shadow-sm">
              <NexusMark className="pointer-events-none absolute -top-10 -right-10 size-56 opacity-[0.04]" />
              <div className="relative mx-auto flex max-w-md flex-col items-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] shadow-sm">
                  <NexusMark className="size-8 text-white" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  Nothing published yet
                </h3>
                <p className="mt-2 text-base text-slate-600">
                  Publish a trademark to make it discoverable by buyers and
                  licensees — it&apos;ll show up here and on your public profile.
                </p>
                <Link
                  href="/listings/new"
                  className={cn(buttonVariants({ size: "lg" }), "mt-7")}
                >
                  <Plus className="size-4" aria-hidden />
                  Create a listing
                </Link>
              </div>
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
