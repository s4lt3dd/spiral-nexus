"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import type { IpAsset } from "@/lib/types";
import { statusLabel, dealTypeLabel } from "@/lib/listings";
import { setListingPublished, deleteListing } from "@/app/(app)/listings/actions";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const meta = [
    statusLabel(listing.status),
    listing.jurisdiction,
    listing.nice_class ? `Nice ${listing.nice_class}` : null,
    dealTypeLabel(listing.deal_type),
    listing.asking_price != null ? gbp.format(listing.asking_price) : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{listing.title}</CardTitle>
          {meta.length > 0 && (
            <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
          )}
        </div>
        <Badge variant={listing.is_published ? "default" : "secondary"}>
          {listing.is_published ? "Published" : "Draft"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
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
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:text-destructive"
              />
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
      </CardContent>
    </Card>
  );
}
