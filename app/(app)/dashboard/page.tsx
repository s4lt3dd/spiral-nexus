import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset } from "@/lib/types";
import type { Tier } from "@/lib/tiers";
import { listingAllowance } from "@/lib/listings";
import { Button, buttonVariants } from "@/components/ui/button";
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your dashboard
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Your listings</h2>
            <p className="text-sm text-muted-foreground">
              {myListings.length}
              {allowance !== null ? ` of ${allowance}` : ""} used
            </p>
          </div>
          <Link
            href="/listings/new"
            aria-disabled={atLimit}
            className={cn(
              buttonVariants(),
              atLimit && "pointer-events-none opacity-50",
            )}
          >
            <Plus className="size-4" aria-hidden />
            New listing
          </Link>
        </div>

        {atLimit && (
          <p className="mt-3 text-sm text-muted-foreground">
            You&apos;ve reached your listing limit. Unpublish or delete one to
            add another.
          </p>
        )}

        {myListings.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">No listings yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              List your first trademark to start reaching buyers and licensees.
            </p>
            <Link
              href="/listings/new"
              className={cn(buttonVariants(), "mt-5")}
            >
              <Plus className="size-4" aria-hidden />
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {myListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
