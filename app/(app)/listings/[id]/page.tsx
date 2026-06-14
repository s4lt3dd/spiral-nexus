// PUBLIC route — /listings/[id] is the buyer-facing detail page, intentionally
// accessible to anonymous visitors. RLS returns a row only if it's published OR
// the viewer is its owner, so drafts 404 for everyone else. Do NOT add
// "/listings" to the protected prefixes in lib/supabase/middleware.ts.

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset, Profile } from "@/lib/types";
import { statusLabel, dealTypeLabel, statusPillVariant } from "@/lib/listings";
import { niceClassLabel } from "@/lib/discovery";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NexusMark } from "@/components/brand/nexus-mark";
import { VerifiedAvatar } from "@/components/marketing/verified-avatar";
import { SiteHeader } from "@/components/marketing/site-header";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ip_assets")
    .select("title,description")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "Listing · Spiral Nexus" };
  return {
    title: `${data.title} · Spiral Nexus`,
    description: data.description ?? "Trademark listing on Spiral Nexus.",
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS: published rows are world-readable; an owner can also read their own
  // draft. Anything else returns null -> 404 (drafts don't leak).
  const { data: listingRow } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!listingRow) notFound();
  const listing = listingRow as IpAsset;

  const { data: ownerRow } = await supabase
    .from("profiles")
    .select("display_name, org_name, verified")
    .eq("id", listing.owner_id)
    .maybeSingle();
  const owner = ownerRow as Pick<
    Profile,
    "display_name" | "org_name" | "verified"
  > | null;

  const isOwner = user?.id === listing.owner_id;
  const ownerName = owner?.display_name || owner?.org_name || "Listing owner";

  const facts: { label: string; value: string | null }[] = [
    { label: "Status", value: statusLabel(listing.status) },
    { label: "Jurisdiction", value: listing.jurisdiction },
    { label: "Registration no.", value: listing.registration_number },
    { label: "Nice class", value: niceClassLabel(listing.nice_class) },
    { label: "Deal type", value: dealTypeLabel(listing.deal_type) },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader authed={!!user} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to browse
        </Link>

        {/* Draft preview banner — only the owner can reach an unpublished row */}
        {!listing.is_published && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <p className="text-sm font-medium text-warning">
              Draft preview — only you can see this. Publish it to make it
              discoverable.
            </p>
            <Link
              href={`/listings/${listing.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left: mark + description + facts */}
          <div className="lg:col-span-2">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-slate-100">
              {listing.mark_image_url ? (
                <Image
                  src={listing.mark_image_url}
                  alt={`${listing.title} mark`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  unoptimized
                  className="object-contain p-8"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <NexusMark className="size-20 opacity-20" />
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {listing.title}
              </h1>
              {listing.status && (
                <Badge variant={statusPillVariant(listing.status)}>
                  {statusLabel(listing.status)}
                </Badge>
              )}
            </div>

            {listing.description && (
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {listing.description}
              </p>
            )}

            <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {facts
                .filter((f) => f.value)
                .map((f) => (
                  <div key={f.label} className="bg-surface px-5 py-4">
                    <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      {f.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">
                      {f.value}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>

          {/* Right: deal + owner + contact */}
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:sticky lg:top-24">
              <p className="text-sm text-slate-500">{dealTypeLabel(listing.deal_type)}</p>
              <p className="mt-1 text-3xl font-semibold text-ink">
                {listing.asking_price != null
                  ? gbp.format(listing.asking_price)
                  : "Price on request"}
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
                {owner?.verified ? (
                  <VerifiedAvatar initials={initials(ownerName)} />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand">
                    {initials(ownerName)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                    {ownerName}
                    {owner?.verified && (
                      <span className="text-xs font-medium text-gold">Verified</span>
                    )}
                  </p>
                  {owner?.org_name && owner?.display_name && (
                    <p className="truncate text-sm text-slate-500">
                      {owner.org_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact CTA — messaging itself arrives in Slice 3 */}
              <div className="mt-6">
                {isOwner ? (
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    Edit your listing
                  </Link>
                ) : user ? (
                  <>
                    <Button className="w-full" disabled>
                      Contact owner
                    </Button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Direct messaging arrives in the next update.
                    </p>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className={cn(buttonVariants(), "w-full")}
                  >
                    Sign in to contact
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
