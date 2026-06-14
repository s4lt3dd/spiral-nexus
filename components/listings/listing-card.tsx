"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import type { IpAsset } from "@/lib/types";
import {
  statusLabel,
  dealTypeLabel,
  statusPillVariant,
} from "@/lib/listings";
import { setListingPublished, deleteListing } from "@/app/(app)/listings/actions";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NexusMark } from "@/components/brand/nexus-mark";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function ListingCard({ listing }: { listing: IpAsset }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  function togglePublished() {
    startTransition(async () => {
      const result = await setListingPublished(listing.id, !listing.is_published);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(listing.is_published ? "Listing unpublished." : "Listing published.");
      router.refresh();
    });
  }

  function onDelete() {
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteListing(listing.id);
      setDeleting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Listing deleted.");
      router.refresh();
    });
  }

  return (
    <Card className="flex-row gap-0 p-0">
      <div className="flex flex-1 flex-col gap-5 p-5 sm:flex-row sm:items-stretch">
        {/* Mark / image block */}
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200/70 sm:w-40">
          {listing.mark_image_url ? (
            <Image
              src={listing.mark_image_url}
              alt={`${listing.title} mark`}
              fill
              sizes="160px"
              // User-supplied external URL — skip the optimizer (avoids it
              // proxying arbitrary hosts) until uploads move to our Storage.
              unoptimized
              className="object-contain p-3"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <NexusMark className="size-10 opacity-25" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg leading-tight font-medium text-foreground">
                {listing.title}
              </h3>
              {listing.description && (
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {listing.description}
                </p>
              )}
            </div>
            <Badge variant={listing.is_published ? "brand" : "slate"}>
              {listing.is_published ? "Published" : "Draft"}
            </Badge>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
            {listing.status && (
              <Badge variant={statusPillVariant(listing.status)}>
                {statusLabel(listing.status)}
              </Badge>
            )}
            {listing.jurisdiction && <span>{listing.jurisdiction}</span>}
            {listing.nice_class != null && (
              <span className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-slate-600 uppercase">
                Nice {listing.nice_class}
              </span>
            )}
            <span className="text-slate-400">·</span>
            <span>{dealTypeLabel(listing.deal_type)}</span>
            {listing.asking_price != null && (
              <span className="ml-auto text-sm font-semibold text-foreground">
                {gbp.format(listing.asking_price)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Link
              href={`/listings/${listing.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={togglePublished}
              disabled={pending}
            >
              {listing.is_published ? "Unpublish" : "Publish"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                disabled={pending}
                render={
                  <Button variant="ghost" size="sm" className="ml-auto text-danger hover:bg-danger/10 hover:text-danger" />
                }
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{listing.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the listing. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    disabled={deleting}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
}
