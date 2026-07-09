// AUTH-GATED route — /saved (your bookmarked listings) is sign-in-only (see
// protectedPrefixes). Saves are private; RLS returns only the viewer's rows.
// Slice D adds a second tab: the viewer's recent activity (likes + follows).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Clock, Heart, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset } from "@/lib/types";
import { profileDisplayName } from "@/lib/profile";
import {
  engagementCounts,
  recentActivity,
  timeAgo,
  viewerLikedSet,
} from "@/lib/engagement";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { ListingBrowseCard } from "@/components/listings/listing-browse-card";

export const metadata = { title: "Saved · Spiral Nexus" };

const TABS = [
  { key: "saved", label: "Saved listings", icon: Bookmark },
  { key: "activity", label: "Recent activity", icon: Clock },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tab: TabKey = raw.tab === "activity" ? "activity" : "saved";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ---- Saved tab data ------------------------------------------------------
  // Saved listing ids, newest save first.
  const { data: saves } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (saves ?? []).map((s) => s.listing_id);

  // Resolve to currently-published listings (a save can outlive a listing being
  // unpublished/deleted), then restore the saved-order.
  let listings: IpAsset[] = [];
  if (tab === "saved" && ids.length > 0) {
    const { data: rows } = await supabase
      .from("ip_assets")
      .select("*")
      .in("id", ids)
      .eq("is_published", true);
    const order = new Map(ids.map((id, i) => [id, i]));
    listings = ((rows ?? []) as IpAsset[]).sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }

  // Engagement signals for the visible cards (batched, never per-card).
  const pageIds = listings.map((l) => l.id);
  const [counts, likedSet] = await Promise.all([
    engagementCounts(supabase, pageIds),
    viewerLikedSet(supabase, user.id, pageIds),
  ]);

  // ---- Activity tab data -----------------------------------------------------
  const activity = tab === "activity" ? await recentActivity(supabase, user.id) : [];

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Saved
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
            Your shortlist
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Trademarks you&apos;ve bookmarked, plus your recent likes and
            follows. Only you can see this page.
          </p>
        </header>

        {/* Tabs */}
        <nav
          aria-label="Saved sections"
          className="mt-8 flex items-center gap-1 border-b border-border"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={t.key === "saved" ? "/saved" : "/saved?tab=activity"}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25",
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-500 hover:text-foreground",
                )}
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {tab === "saved" ? (
          listings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
                <Bookmark className="size-6" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-ink">
                Nothing saved yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-slate-600">
                Browse trademarks and tap the bookmark to save them here for
                later.
              </p>
              <Link
                href="/listings"
                className={cn(buttonVariants({ size: "lg" }), "mt-7")}
              >
                Browse trademarks
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingBrowseCard
                  key={listing.id}
                  listing={listing}
                  saved
                  engagement={{
                    liked: likedSet.has(listing.id),
                    likeCount: counts.likes.get(listing.id) ?? 0,
                    saveCount: counts.saves.get(listing.id) ?? 0,
                  }}
                />
              ))}
            </div>
          )
        ) : activity.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
              <Clock className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-ink">
              No activity yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">
              Like listings you rate and follow members you want to keep up
              with — your trail shows up here.
            </p>
            <Link
              href="/listings"
              className={cn(buttonVariants({ size: "lg" }), "mt-7")}
            >
              Browse trademarks
            </Link>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {activity.map((item, i) => (
              <li key={`${item.kind}-${item.at}-${i}`}>
                {item.kind === "like" && item.listing ? (
                  <Link
                    href={`/listings/${item.listing.id}`}
                    className="flex items-center gap-3.5 px-5 py-4 transition-colors outline-none hover:bg-slate-50 focus-visible:bg-slate-50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                      <Heart className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-slate-600">
                      You liked{" "}
                      <span className="font-medium text-ink">
                        {item.listing.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(item.at)}
                    </span>
                  </Link>
                ) : item.kind === "follow" && item.member ? (
                  <Link
                    href={`/u/${item.member.id}`}
                    className="flex items-center gap-3.5 px-5 py-4 transition-colors outline-none hover:bg-slate-50 focus-visible:bg-slate-50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
                      <UserPlus className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-slate-600">
                      You followed{" "}
                      <span className="font-medium text-ink">
                        {profileDisplayName(item.member)}
                      </span>
                      {item.member.org_name && item.member.display_name && (
                        <span className="text-slate-400">
                          {" "}
                          · {item.member.org_name}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(item.at)}
                    </span>
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
