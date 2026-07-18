// AUTH-GATED route — /listings/[id] is sign-in-only (see middleware). RLS still
// returns a row only if it's published OR the viewer is its owner, so drafts
// 404 for other signed-in users.

import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { IpAsset, Profile } from "@/lib/types";
import {
  statusLabel,
  dealTypeLabel,
  statusPillVariant,
  formatPrice,
  renewalLabel,
} from "@/lib/listings";
import { niceClassesLabel } from "@/lib/discovery";
import { niceClassLabel } from "@/lib/profile";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NexusMark } from "@/components/brand/nexus-mark";
import { VerifiedAvatar } from "@/components/marketing/verified-avatar";
import { SiteHeader } from "@/components/marketing/site-header";
import { ContactOwnerDialog } from "@/components/messages/contact-owner-dialog";
import { SaveButton } from "@/components/listings/save-button";
import { LikeButton } from "@/components/listings/like-button";
import { engagementCounts, viewerLikedSet } from "@/lib/engagement";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
  if (!user) redirect("/login");

  // RLS: published rows are readable by any signed-in user; an owner can also
  // read their own draft. Anything else returns null -> 404 (drafts don't leak).
  const { data: listingRow } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!listingRow) notFound();
  const listing = listingRow as IpAsset;

  // Owner profile, viewer's saved state, engagement counts, viewer's like,
  // and the certificate signed URL (short-lived; the listing-docs bucket is
  // private) are independent — fetch them concurrently.
  const [{ data: ownerRow }, { data: savedRow }, signedRes, counts, likedSet] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, org_name, verified")
        .eq("id", listing.owner_id)
        .maybeSingle(),
      supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id)
        .eq("listing_id", id)
        .maybeSingle(),
      listing.certificate_path
        ? supabase.storage
            .from("listing-docs")
            .createSignedUrl(listing.certificate_path, 60 * 60)
        : Promise.resolve(null),
      engagementCounts(supabase, [id]),
      viewerLikedSet(supabase, user.id, [id]),
    ]);
  const likeCount = counts.likes.get(id) ?? 0;
  const saveCount = counts.saves.get(id) ?? 0;
  const owner = ownerRow as Pick<
    Profile,
    "display_name" | "org_name" | "verified"
  > | null;

  const isOwner = user?.id === listing.owner_id;
  const ownerName = owner?.display_name || owner?.org_name || "Listing owner";
  const isSaved = !!savedRow;
  const certificateUrl = signedRes?.data?.signedUrl ?? null;

  // Uploaded images win over the legacy single mark URL.
  const gallery = [
    ...(listing.images ?? []),
    ...(listing.mark_image_url ? [listing.mark_image_url] : []),
  ];
  const [mainImage, ...moreImages] = gallery;

  const facts: { label: string; value: string | null }[] = [
    { label: "Status", value: statusLabel(listing.status) },
    { label: "Registration office", value: listing.jurisdiction },
    { label: "Registration no.", value: listing.registration_number },
    {
      label: "Filing date",
      value: listing.filing_date ? formatDate(listing.filing_date) : null,
    },
    { label: "Nice classes", value: niceClassesLabel(listing.nice_classes) },
    {
      label: "Territory",
      value: listing.territory?.length ? listing.territory.join(", ") : null,
    },
    { label: "Deal type", value: dealTypeLabel(listing.deal_type) },
    ...(listing.deal_type !== "sale"
      ? [
          { label: "License duration", value: listing.license_duration },
          { label: "Renewal", value: renewalLabel(listing.license_renewable) },
        ]
      : []),
    { label: "Listed", value: formatDate(listing.created_at.slice(0, 10)) },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader email={user?.email ?? null} />

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
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-surface-raised">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={`${listing.title} mark`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <NexusMark className="size-20 opacity-20" />
                </div>
              )}
            </div>

            {moreImages.length > 0 && (
              <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {moreImages.map((url) => (
                  <li
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-raised"
                  >
                    <Image
                      src={url}
                      alt={`${listing.title} image`}
                      fill
                      sizes="120px"
                      unoptimized
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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

            {/* What the mark actually covers — Nice classes with their names,
                not just numbers. The single most useful "more detail" for a
                trademark buyer. */}
            {listing.nice_classes?.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Goods &amp; services covered
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {listing.nice_classes.map((n) => (
                    <li
                      key={n}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm"
                    >
                      <span className="font-medium text-brand-text">Nice {n}</span>
                      <span className="text-slate-600">{niceClassLabel(n)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {facts
                .filter((f) => f.value)
                .map((f) => (
                  <div key={f.label} className="bg-surface px-5 py-4">
                    <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      {f.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {f.value}
                    </dd>
                  </div>
                ))}
            </dl>

            {(listing.office_url || certificateUrl) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {listing.office_url && (
                  <a
                    href={listing.office_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    View official record
                  </a>
                )}
                {certificateUrl && (
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    <FileText className="size-4" aria-hidden />
                    Registration certificate
                  </a>
                )}
              </div>
            )}

            {listing.encumbrances && (
              <section className="mt-8">
                <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Encumbrances or restrictions
                </h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600">
                  {listing.encumbrances}
                </p>
              </section>
            )}

            {listing.quality_control && (
              <section className="mt-6">
                <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Quality &amp; control
                </h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600">
                  {listing.quality_control}
                </p>
              </section>
            )}
          </div>

          {/* Right: deal + owner + contact */}
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:sticky lg:top-24">
              <p className="text-sm text-slate-500">{dealTypeLabel(listing.deal_type)}</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {listing.asking_price != null
                  ? formatPrice(listing.asking_price, listing.currency)
                  : "Price on request"}
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
                {owner?.verified ? (
                  <VerifiedAvatar initials={initials(ownerName)} />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand-text">
                    {initials(ownerName)}
                  </span>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/u/${listing.owner_id}`}
                    className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {ownerName}
                    {owner?.verified && (
                      <span className="text-xs font-medium text-gold">Verified</span>
                    )}
                  </Link>
                  {owner?.org_name && owner?.display_name && (
                    <p className="truncate text-sm text-slate-500">
                      {owner.org_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact CTA */}
              <div className="mt-6">
                {isOwner ? (
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    Edit your listing
                  </Link>
                ) : (
                  <ContactOwnerDialog
                    listingId={listing.id}
                    ownerName={ownerName}
                  />
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <SaveButton
                  listingId={listing.id}
                  initialSaved={isSaved}
                  showLabel
                />
                <LikeButton
                  listingId={listing.id}
                  initialLiked={likedSet.has(id)}
                  initialCount={likeCount}
                  showLabel
                />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">
                Saved by {saveCount}{" "}
                {saveCount === 1 ? "member" : "members"}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
