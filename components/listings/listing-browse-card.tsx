import Link from "next/link";
import Image from "next/image";

import type { IpAsset } from "@/lib/types";
import { statusLabel, dealTypeLabel, statusPillVariant } from "@/lib/listings";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NexusMark } from "@/components/brand/nexus-mark";
import { SaveButton } from "@/components/listings/save-button";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

// Public, clickable listing card for the browse grid. Mirrors the dashboard
// ListingCard's visual language (mark block, Fraunces title, meta, price) but
// links to the detail page and carries no owner actions.
// `saved` is optional: when provided (Browse + Saved pages) a bookmark toggle
// is overlaid as a sibling of the Link (not nested — invalid HTML + would
// swallow navigation). Omitted in showcase contexts (home, public profile).
export function ListingBrowseCard({
  listing,
  saved,
}: {
  listing: IpAsset;
  saved?: boolean;
}) {
  const card = (
    <Link
      href={`/listings/${listing.id}`}
      className="group rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
    >
      <Card className="h-full gap-0 p-0 transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-brand/30 group-hover:shadow-md">
        {/* Mark / image block */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-slate-100">
          {listing.mark_image_url ? (
            <Image
              src={listing.mark_image_url}
              alt={`${listing.title} mark`}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              unoptimized
              className="object-contain p-6"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <NexusMark className="size-12 opacity-20" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate font-display text-lg leading-tight font-medium text-foreground">
              {listing.title}
            </h3>
            {listing.status && (
              <Badge variant={statusPillVariant(listing.status)}>
                {statusLabel(listing.status)}
              </Badge>
            )}
          </div>

          {listing.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
              {listing.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-slate-500">
            {listing.jurisdiction && <span>{listing.jurisdiction}</span>}
            {listing.nice_class != null && (
              <span className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-slate-600 uppercase">
                Nice {listing.nice_class}
              </span>
            )}
            <span className="text-slate-400">·</span>
            <span>{dealTypeLabel(listing.deal_type)}</span>
            {listing.asking_price != null && (
              <span className="ml-auto font-semibold text-foreground">
                {gbp.format(listing.asking_price)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );

  if (saved === undefined) return card;

  return (
    <div className="relative">
      {card}
      <SaveButton
        listingId={listing.id}
        initialSaved={saved}
        className="absolute top-3 right-3 z-10"
      />
    </div>
  );
}
