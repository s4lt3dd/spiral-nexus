"use client";

import { useState, useTransition } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { followUser, unfollowUser } from "@/app/(app)/u/actions";

// Optimistic follow/unfollow toggle. Stops click propagation so it works when
// overlaid on a clickable member card.
export function FollowButton({
  targetId,
  initialFollowing,
  size = "default",
  iconOnly = false,
  className,
}: {
  targetId: string;
  initialFollowing: boolean;
  size?: "default" | "sm";
  iconOnly?: boolean;
  className?: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !following;
    setFollowing(next); // optimistic
    startTransition(async () => {
      const res = next
        ? await followUser(targetId)
        : await unfollowUser(targetId);
      if (!res.ok) {
        setFollowing(!next); // roll back
        toast.error(res.error);
        return;
      }
      setFollowing(res.following);
    });
  }

  const Icon = following ? UserCheck : UserPlus;
  const base =
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border font-medium shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50";
  const tone = following
    ? "border-border bg-surface text-slate-700 hover:bg-slate-50"
    : "border-transparent bg-primary text-primary-foreground hover:bg-brand-hover";

  // Compact icon-only — used on dense directory cards so they don't crowd.
  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        aria-label={following ? "Unfollow" : "Follow"}
        className={cn(base, "size-9", tone, className)}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        base,
        "gap-1.5 text-sm",
        size === "sm" ? "h-9 px-3" : "h-10 px-4",
        tone,
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
      {following ? "Following" : "Follow"}
    </button>
  );
}
