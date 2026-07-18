"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { saveListing, unsaveListing } from "@/app/(app)/saved/actions";

// Optimistic save/unsave toggle. Icon-only by default (for cards); pass
// showLabel for a labelled button (detail page). Stops click propagation so it
// works when overlaid on a clickable card.
export function SaveButton({
  listingId,
  initialSaved,
  showLabel = false,
  className,
}: {
  listingId: string;
  initialSaved: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const res = next
        ? await saveListing(listingId)
        : await unsaveListing(listingId);
      if (!res.ok) {
        setSaved(!next); // roll back
        toast.error(res.error);
        return;
      }
      setSaved(res.saved);
    });
  }

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={cn(
          "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-slate-700 shadow-xs transition-colors outline-none hover:bg-slate-50 focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50",
          saved && "border-gold/40 bg-gold-tint text-foreground",
          className,
        )}
      >
        <Bookmark
          className={cn("size-4", saved && "fill-gold text-gold")}
          aria-hidden
        />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/90 text-slate-600 shadow-sm backdrop-blur transition-colors outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50",
        saved && "border-gold/40 text-gold",
        className,
      )}
    >
      <Bookmark
        className={cn("size-4", saved && "fill-gold text-gold")}
        aria-hidden
      />
    </button>
  );
}
