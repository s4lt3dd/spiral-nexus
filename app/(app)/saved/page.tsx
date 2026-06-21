// AUTH-GATED route — /saved (your bookmarked listings) is sign-in-only (see
// protectedPrefixes). Saves are private; RLS returns only the viewer's rows.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { ListingBrowseCard } from "@/components/listings/listing-browse-card";

export const metadata = { title: "Saved · Spiral Nexus" };

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
  if (ids.length > 0) {
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

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Saved
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
            Saved listings
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Trademarks you&apos;ve bookmarked to revisit. Only you can see this
            list.
          </p>
        </header>

        {listings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
              <Bookmark className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-ink">
              Nothing saved yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">
              Browse trademarks and tap the bookmark to save them here for later.
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
              <ListingBrowseCard key={listing.id} listing={listing} saved />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
