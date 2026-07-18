// AUTH-GATED route — /listings (browse grid) is sign-in-only: trademarks are
// visible only to signed-in users. Enforced by middleware (protectedPrefixes in
// lib/supabase/middleware.ts) and re-checked here as defence in depth.

import { redirect } from "next/navigation";
import { Search } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  discoveryParamsSchema,
  searchListings,
  type DiscoveryParams,
} from "@/lib/discovery";
import type { IpAsset } from "@/lib/types";
import { engagementCounts, viewerLikedSet } from "@/lib/engagement";
import { SiteHeader } from "@/components/marketing/site-header";
import { SearchFilters } from "@/components/listings/search-filters";
import { ListingBrowseCard } from "@/components/listings/listing-browse-card";
import { ListingsPagination } from "@/components/listings/listings-pagination";

export const metadata = { title: "Browse trademarks · Spiral Nexus" };

type RawParams = Record<string, string | string[] | undefined>;

function firstValues(raw: RawParams) {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const raw = firstValues(await searchParams);
  const parsed = discoveryParamsSchema.safeParse(raw);
  const params: DiscoveryParams = parsed.success
    ? parsed.data
    : discoveryParamsSchema.parse({});

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { rows, count, pageCount } = await searchListings(
    supabase,
    params,
    user?.id ?? null,
  );
  const listings = rows as IpAsset[];

  // The viewer's saved set (bookmark state), like/save counts, and the
  // viewer's likes — three batched queries for the whole page, never per-card.
  const pageIds = listings.map((l) => l.id);
  const [{ data: savedRows }, counts, likedSet] = await Promise.all([
    supabase.from("saved_listings").select("listing_id").eq("user_id", user.id),
    engagementCounts(supabase, pageIds),
    viewerLikedSet(supabase, user.id, pageIds),
  ]);
  const savedIds = new Set((savedRows ?? []).map((r) => r.listing_id));

  return (
    <div className="min-h-screen">
      <SiteHeader email={user?.email ?? null} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Browse trademarks
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Discover marks available to licence or buy, and reach out to their
            owners directly.
          </p>
        </header>

        <div className="mt-8">
          <SearchFilters current={params} />
        </div>

        <p className="mt-6 text-sm text-slate-500" aria-live="polite">
          {count} {count === 1 ? "listing" : "listings"}
        </p>

        {listings.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-text">
              <Search className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-foreground">
              No matching listings
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">
              Try a different search term or clear your filters to see everything
              available.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingBrowseCard
                key={listing.id}
                listing={listing}
                saved={savedIds.has(listing.id)}
                engagement={{
                  liked: likedSet.has(listing.id),
                  likeCount: counts.likes.get(listing.id) ?? 0,
                  saveCount: counts.saves.get(listing.id) ?? 0,
                }}
              />
            ))}
          </div>
        )}

        <ListingsPagination current={params} pageCount={pageCount} />
      </main>
    </div>
  );
}
