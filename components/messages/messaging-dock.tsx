"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, MessagesSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InboxRowVM } from "@/lib/inbox";
import { useInboxLive } from "@/components/messages/use-inbox-live";

// LinkedIn-style docked messaging panel (founder ask, issue #2): a persistent,
// collapsible conversation panel anchored bottom-right of the product, so
// messaging is reachable from any page without leaving what you're doing.
// Conversations open in the full thread page (the robust realtime thread).
// Desktop only; the full Messages page is the mobile experience.
export function MessagingDock({
  currentUserId,
  initialRows,
}: {
  currentUserId: string;
  initialRows: InboxRowVM[];
}) {
  const pathname = usePathname();
  // The full Messages page already IS the inbox — don't double up (also avoids a
  // second "inbox" realtime channel on the client).
  if (pathname.startsWith("/messages")) return null;
  return (
    <MessagingDockPanel currentUserId={currentUserId} initialRows={initialRows} />
  );
}

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

function MessagingDockPanel({
  currentUserId,
  initialRows,
}: {
  currentUserId: string;
  initialRows: InboxRowVM[];
}) {
  const rows = useInboxLive(currentUserId, initialRows);
  const [open, setOpen] = useState(false);
  const totalUnread = rows.reduce((n, r) => n + r.unread, 0);

  return (
    <div className="fixed right-4 bottom-0 z-40 hidden w-[360px] max-w-[calc(100vw-2rem)] sm:block">
      <div className="rounded-t-xl border border-b-0 border-border bg-surface shadow-lg">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-t-xl px-4 py-3 text-left transition-colors hover:bg-surface-raised"
        >
          <span className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
            <MessagesSquare className="size-4 text-brand-text" aria-hidden />
            Messaging
            {totalUnread > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold tabular-nums text-white">
                {totalUnread}
              </span>
            )}
          </span>
          {open ? (
            <ChevronDown className="size-4 text-slate-400" aria-hidden />
          ) : (
            <ChevronUp className="size-4 text-slate-400" aria-hidden />
          )}
        </button>

        {open && (
          <div className="border-t border-border">
            {rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No messages yet.
              </p>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                {rows.map((c) => {
                  const prefix =
                    c.snippet?.senderId === currentUserId ? "You: " : "";
                  const unread = c.unread > 0;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/messages/${c.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-raised"
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand-text">
                          {c.otherInitial}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "truncate text-sm text-foreground",
                                unread ? "font-semibold" : "font-medium",
                              )}
                            >
                              {c.otherName}
                            </p>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {unread && (
                                <span
                                  className="size-2 rounded-full bg-brand"
                                  aria-label={`${c.unread} unread`}
                                />
                              )}
                              <span className="text-xs text-slate-400">
                                {timeAgo(c.lastMessageAt)}
                              </span>
                            </span>
                          </div>
                          {c.snippet && (
                            <p
                              className={cn(
                                "mt-0.5 truncate text-xs",
                                unread
                                  ? "font-medium text-foreground"
                                  : "text-slate-500",
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
            )}
            <div className="border-t border-border p-2">
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-center text-sm font-medium text-brand-text transition-colors hover:bg-surface-raised"
              >
                Open Messages
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
