"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { InboxRowVM } from "@/lib/inbox";

// Live inbox state: adopts a server snapshot as its baseline and patches it from
// the realtime `messages` firehose (snippet / time / unread / order), resyncing
// from the server on reconnect or refocus. Shared by the full Messages list and
// the docked panel so their live behaviour is identical.
export function useInboxLive(
  currentUserId: string,
  initialRows: InboxRowVM[],
): InboxRowVM[] {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<InboxRowVM[]>(initialRows);

  // Mirror state synchronously so the realtime handler can decide whether a
  // thread is known WITHOUT reading/setting state inside a setState updater
  // (updaters run during render — calling router.refresh() there is illegal).
  const rowsRef = useRef<InboxRowVM[]>(initialRows);
  const commit = useCallback((next: InboxRowVM[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  // When the server sends fresh data (resync/refresh), adopt it as the new
  // baseline — React's documented "reset state on prop change" pattern.
  const [baseline, setBaseline] = useState(initialRows);
  if (baseline !== initialRows) {
    setBaseline(initialRows);
    setRows(initialRows);
  }

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

  return rows;
}
