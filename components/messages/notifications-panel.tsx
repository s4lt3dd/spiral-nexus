import Link from "next/link";
import { Bell, Heart, UserPlus } from "lucide-react";

import type { NotificationItem } from "@/lib/engagement";
import { timeAgo } from "@/lib/engagement";
import { profileDisplayName } from "@/lib/profile";

// Server-rendered notifications strip for the Messages page (Slice D):
// likes on YOUR listings and new followers, newest first. Read-state
// tracking is a later concern — this is a recency feed, not an inbox.
export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="notifications-heading" className="mt-10">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-brand-text" aria-hidden />
        <h2
          id="notifications-heading"
          className="font-display text-lg font-medium text-foreground"
        >
          Notifications
        </h2>
      </div>

      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {items.map((n, i) => {
          const actorName = n.actor
            ? profileDisplayName(n.actor)
            : "A member";
          return (
            <li key={`${n.kind}-${n.at}-${i}`}>
              {n.kind === "like" ? (
                <Link
                  href={`/listings/${n.listing.id}`}
                  className="flex items-center gap-3.5 px-5 py-3.5 transition-colors outline-none hover:bg-slate-50 focus-visible:bg-slate-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-text">
                    <Heart className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                    <span className="font-medium text-foreground">{actorName}</span>{" "}
                    liked{" "}
                    <span className="font-medium text-foreground">
                      {n.listing.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {timeAgo(n.at)}
                  </span>
                </Link>
              ) : (
                <Link
                  href={n.actor ? `/u/${n.actor.id}` : "/network"}
                  className="flex items-center gap-3.5 px-5 py-3.5 transition-colors outline-none hover:bg-slate-50 focus-visible:bg-slate-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-text">
                    <UserPlus className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                    <span className="font-medium text-foreground">{actorName}</span>{" "}
                    started following you
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {timeAgo(n.at)}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
