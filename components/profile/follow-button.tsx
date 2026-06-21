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
  className,
}: {
  targetId: string;
  initialFollowing: boolean;
  size?: "default" | "sm";
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

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border font-medium shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50",
        size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        following
          ? "border-border bg-surface text-slate-700 hover:bg-slate-50"
          : "border-transparent bg-primary text-primary-foreground hover:bg-brand-hover",
        className,
      )}
    >
      {following ? (
        <UserCheck className="size-4" aria-hidden />
      ) : (
        <UserPlus className="size-4" aria-hidden />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}
