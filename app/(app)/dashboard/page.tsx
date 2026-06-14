import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset } from "@/lib/types";
import type { Tier } from "@/lib/tiers";
import { listingAllowance } from "@/lib/listings";
import { buttonVariants } from "@/components/ui/button";
import { AppHeader } from "@/components/app/app-header";
import { NexusMark } from "@/components/brand/nexus-mark";
import { ListingCard } from "@/components/listings/listing-card";

export const metadata = { title: "Dashboard · Spiral Nexus" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: listings }, { data: profile }] = await Promise.all([
    supabase
      .from("ip_assets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single(),
  ]);

  const myListings = (listings ?? []) as IpAsset[];
  const allowance = listingAllowance(
    (profile?.subscription_tier ?? "entry") as Tier,
  );
  const atLimit = allowance !== null && myListings.length >= allowance;
  const publishedCount = myListings.filter((l) => l.is_published).length;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        {/* Page heading */}
        <div className="animate-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-brand uppercase">
              Your portfolio
            </p>
            <h1 className="mt-2 text-4xl leading-[1.05] font-semibold text-ink">
              Trademark listings
            </h1>
            <p className="mt-3 max-w-prose text-base text-slate-600">
              Create, refine, and publish the marks you&apos;re ready to license
              or sell. Published listings are discoverable by buyers and
              licensees.
            </p>
          </div>
          {myListings.length > 0 && (
            <Link
              href="/listings/new"
              aria-disabled={atLimit}
              className={cn(
                buttonVariants({ size: "lg" }),
                atLimit && "pointer-events-none opacity-50",
              )}
            >
              <Plus className="size-4" aria-hidden />
              New listing
            </Link>
          )}
        </div>

        {/* Stat strip */}
        {myListings.length > 0 && (
          <dl className="animate-rise mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-sm">
            {[
              { label: "Total", value: myListings.length },
              { label: "Published", value: publishedCount },
              {
                label: "Allowance",
                value:
                  allowance === null
                    ? "Unlimited"
                    : `${myListings.length}/${allowance}`,
              },
            ].map((s) => (
              <div key={s.label} className="min-w-0 bg-surface px-4 py-4 sm:px-5">
                <dt className="truncate text-xs font-medium tracking-wide text-slate-500 uppercase">
                  {s.label}
                </dt>
                <dd className="mt-1 truncate text-xl font-semibold text-ink sm:text-2xl">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {atLimit && (
          <p className="mt-4 text-sm text-warning">
            You&apos;ve reached your listing limit. Unpublish or delete one to
            add another.
          </p>
        )}

        {/* Listings */}
        <section className="mt-8">
          {myListings.length === 0 ? (
            <div className="animate-rise relative overflow-hidden rounded-xl border border-border bg-surface px-8 py-16 text-center shadow-sm">
              <NexusMark className="pointer-events-none absolute -top-10 -right-10 size-56 opacity-[0.04]" />
              <div className="relative mx-auto flex max-w-md flex-col items-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] shadow-sm">
                  <NexusMark className="size-8 text-white" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold text-ink">
                  List your first trademark
                </h2>
                <p className="mt-2 text-base text-slate-600">
                  Turn a dormant mark into a licensing or sale opportunity. It
                  takes a minute, and you can keep it as a draft until
                  you&apos;re ready.
                </p>
                <Link
                  href="/listings/new"
                  className={cn(buttonVariants({ size: "lg" }), "mt-7")}
                >
                  <Plus className="size-4" aria-hidden />
                  Create your first listing
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {myListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
