"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { likeListing, unlikeListing } from "@/app/(app)/listings/like-actions";

// Optimistic like toggle with a live count — the social sibling of SaveButton.
// Icon+count by default (cards); pass showLabel for the detail page. Stops
// click propagation so it works overlaid on a clickable card.
export function LikeButton({
  listingId,
  initialLiked,
  initialCount,
  showLabel = false,
  className,
}: {
  listingId: string;
  initialLiked: boolean;
  initialCount: number;
  showLabel?: boolean;
  className?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    setLiked(next); // optimistic
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    startTransition(async () => {
      const res = next
        ? await likeListing(listingId)
        : await unlikeListing(listingId);
      if (!res.ok) {
        setLiked(!next); // roll back
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        toast.error(res.error);
        return;
      }
      setLiked(res.liked);
    });
  }

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={liked}
        className={cn(
          "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-slate-700 shadow-xs transition-colors outline-none hover:bg-slate-50 focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50",
          liked && "border-red-500/40 bg-red-500/10 text-foreground",
          className,
        )}
      >
        <Heart
          className={cn("size-4", liked && "fill-red-500 text-red-500")}
          aria-hidden
        />
        {liked ? "Liked" : "Like"}
        <span className="tabular-nums text-slate-500">{count}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike listing" : "Like listing"}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 text-sm text-slate-600 shadow-sm backdrop-blur transition-colors outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50",
        liked && "border-red-500/40 text-foreground",
        className,
      )}
    >
      <Heart
        className={cn("size-4", liked && "fill-red-500 text-red-500")}
        aria-hidden
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
