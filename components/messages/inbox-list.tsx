"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Display-ready row shaped server-side so this component stays presentational +
// live. Live message events only need to patch snippet / time / unread / order.
export type InboxRowVM = {
  id: string;
  otherName: string;
  otherInitial: string;
  listingTitle: string;
  lastMessageAt: string;
  snippet: { body: string; senderId: string } | null;
  unread: number;
};

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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<InboxRowVM[]>(initialRows);

  // Mirror state synchronously so the realtime handler can decide whether a thread
  // is known WITHOUT reading/setting state inside a setState updater (updaters run
  // during render — calling router.refresh() there updates the Router mid-render).
  const rowsRef = useRef<InboxRowVM[]>(initialRows);
  const commit = useCallback((next: InboxRowVM[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  // When the server sends fresh data (after a resync/refresh), adopt it as the new
  // baseline. Done during render — React's documented "reset state on prop change"
  // pattern — so live edits since the last server render are intentionally dropped
  // in favour of the authoritative snapshot.
  const [baseline, setBaseline] = useState(initialRows);
  if (baseline !== initialRows) {
    setBaseline(initialRows);
    setRows(initialRows);
  }

  // Keep the ref in step with committed state after every render (covers the
  // baseline reset above, which can't write the ref during render).
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Server is the source of truth for ordering, snippets and unread — pull a
  // fresh render when we reconnect or refocus (covers events missed offline).
  const resync = useCallback(() => router.refresh(), [router]);

  // One unfiltered subscription: RLS scopes the message firehose to exactly the
  // conversations this user is in, so every event belongs in their inbox.
  useEffect(() => {
    let sawDrop = false;
    const channel = supabase
      .channel("inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as {
            conversation_id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          const prev = rowsRef.current;
          const idx = prev.findIndex((r) => r.id === m.conversation_id);
          // A message in a thread we don't have yet (e.g. someone just started
          // one) — pull the full row from the server.
          if (idx === -1) {
            resync();
            return;
          }
          const fromMe = m.sender_id === currentUserId;
          const updated: InboxRowVM = {
            ...prev[idx],
            snippet: { body: m.body, senderId: m.sender_id },
            lastMessageAt: m.created_at,
            unread: fromMe ? prev[idx].unread : prev[idx].unread + 1,
          };
          // Newest message → move the thread to the top.
          commit([updated, ...prev.filter((_, i) => i !== idx)]);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (sawDrop) {
            sawDrop = false;
            resync();
          }
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          sawDrop = true;
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, resync, commit]);

  // Keep the socket's JWT fresh past the ~1h access-token expiry.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        supabase.realtime.setAuth(session?.access_token);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Refocus / regain network → resync from the server.
  useEffect(() => {
    const trigger = () => {
      if (document.visibilityState === "visible") resync();
    };
    window.addEventListener("focus", trigger);
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", trigger);
    return () => {
      window.removeEventListener("focus", trigger);
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", trigger);
    };
  }, [resync]);

  if (rows.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
          <MessagesSquare className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-medium text-ink">No messages yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
          When you contact an owner from a listing, the conversation shows up
          here.
        </p>
        <Link
          href="/listings"
          className="mt-5 inline-block text-sm font-medium text-brand hover:underline"
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
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand">
                {c.otherInitial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "truncate text-ink",
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
                      unread ? "font-medium text-ink" : "text-slate-600",
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
