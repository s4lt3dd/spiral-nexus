"use client";

import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InboxRowVM } from "@/lib/inbox";
import { useInboxLive } from "@/components/messages/use-inbox-live";

// Re-exported so existing importers (the Messages page) keep working.
export type { InboxRowVM } from "@/lib/inbox";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function InboxList({
  currentUserId,
  initialRows,
}: {
  currentUserId: string;
  initialRows: InboxRowVM[];
}) {
  const rows = useInboxLive(currentUserId, initialRows);

  if (rows.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-text">
          <MessagesSquare className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-medium text-foreground">No messages yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
          When you contact an owner from a listing, the conversation shows up
          here.
        </p>
        <Link
          href="/listings"
          className="mt-5 inline-block text-sm font-medium text-brand-text hover:underline"
        >
          Browse trademarks →
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {rows.map((c) => {
        const prefix = c.snippet?.senderId === currentUserId ? "You: " : "";
        const unread = c.unread > 0;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand-text">
                {c.otherInitial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "truncate text-foreground",
                      unread ? "font-semibold" : "font-medium",
                    )}
                  >
                    {c.otherName}
                  </p>
                  <span className="flex shrink-0 items-center gap-2">
                    {unread && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold tabular-nums text-white">
                        {c.unread}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </span>
                </div>
                <p className="truncate text-sm text-slate-500">
                  {c.listingTitle}
                </p>
                {c.snippet && (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-sm",
                      unread ? "font-medium text-foreground" : "text-slate-600",
                    )}
                  >
                    {prefix}
                    {c.snippet.body}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
