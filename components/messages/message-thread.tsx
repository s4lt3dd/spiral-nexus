"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { MessageComposer } from "@/components/messages/message-composer";
import { markConversationRead, sendMessage } from "@/app/(app)/messages/actions";

// Selected columns must match the `Message` shape so realtime rows, catch-up
// refetches and the server action all reconcile cleanly by id.
const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, created_at";
// How close to the bottom counts as "following along" for auto-scroll.
const NEAR_BOTTOM_PX = 120;

type Outgoing = "sending" | "failed";
// A message in flight carries a stable `tempId` (its React key survives the
// temp→real id swap) and a `pending` state; confirmed messages have neither.
type ThreadMessage = Message & { pending?: Outgoing; tempId?: string };

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [showNewPill, setShowNewPill] = useState(false);

  // `messagesRef` mirrors state synchronously so realtime/catch-up handlers can
  // make dedupe decisions without depending on `messages` (which would churn the
  // subscription effect). Every mutation goes through `commit`/`transform`.
  const messagesRef = useRef<ThreadMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const sawDropRef = useRef(false);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const commit = useCallback((next: ThreadMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const transform = useCallback(
    (fn: (prev: ThreadMessage[]) => ThreadMessage[]) => {
      commit(fn(messagesRef.current));
    },
    [commit],
  );

  const scrollToBottom = useCallback(
    (smooth = true) => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth && !prefersReducedMotion ? "smooth" : "auto",
        block: "end",
      });
      setShowNewPill(false);
    },
    [prefersReducedMotion],
  );

  // Merge a single row (realtime INSERT or catch-up refetch) into state.
  const ingest = useCallback(
    (incoming: Message) => {
      const prev = messagesRef.current;
      // Already applied (our confirmed send, or a duplicate echo / overlap).
      if (prev.some((m) => m.id === incoming.id)) return;

      let reconciled = false;
      let next: ThreadMessage[];
      if (incoming.sender_id === currentUserId) {
        // Echo of one of our own optimistic bubbles: adopt the real id + server
        // timestamp in place, keeping the stable key so it doesn't flicker.
        const idx = prev.findIndex(
          (m) =>
            m.pending === "sending" &&
            m.sender_id === currentUserId &&
            m.body === incoming.body,
        );
        if (idx !== -1) {
          next = [...prev];
          next[idx] = { ...incoming, tempId: prev[idx].tempId };
          reconciled = true;
        } else {
          next = [...prev, { ...incoming }];
        }
      } else {
        next = [...prev, { ...incoming }];
      }
      commit(next);

      const fromOther = incoming.sender_id !== currentUserId;
      if (!reconciled) {
        if (!fromOther || atBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom(true));
        } else {
          setShowNewPill(true);
        }
      }
      // Reading the thread → keep our read marker current for the inbox badge.
      if (fromOther && document.visibilityState === "visible") {
        void markConversationRead(conversationId);
      }
    },
    [commit, conversationId, currentUserId, scrollToBottom],
  );

  // Refetch anything newer than the latest confirmed message and merge it. Fills
  // gaps left by socket events dropped while disconnected/backgrounded. `gte` +
  // id-dedupe makes the boundary message safe to re-pull.
  const catchUp = useCallback(async () => {
    let sinceMax: string | null = null;
    for (const m of messagesRef.current) {
      if (!m.pending && (!sinceMax || m.created_at > sinceMax)) {
        sinceMax = m.created_at;
      }
    }
    let query = supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (sinceMax) query = query.gte("created_at", sinceMax);
    const { data, error } = await query;
    if (error || !data) return;
    for (const row of data) ingest(row as Message);
  }, [conversationId, ingest, supabase]);

  const doSend = useCallback(
    async (raw: string) => {
      const body = raw.trim();
      if (!body) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: ThreadMessage = {
        id: tempId,
        tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        body,
        created_at: new Date().toISOString(),
        pending: "sending",
      };
      transform((prev) => [...prev, optimistic]);
      requestAnimationFrame(() => scrollToBottom(true));

      const result = await sendMessage({ conversationId, body });
      if (!result.ok) {
        // Never leave a stuck "Sending…": flag it for retry and tell the user why.
        transform((prev) =>
          prev.map((m) =>
            m.tempId === tempId ? { ...m, pending: "failed" } : m,
          ),
        );
        toast.error(result.error);
        return;
      }
      // Confirm: swap temp id → real id + server timestamp. If the realtime echo
      // already reconciled this bubble, matching by tempId just re-confirms it.
      transform((prev) =>
        prev.map((m) =>
          m.tempId === tempId ? { ...result.message, tempId } : m,
        ),
      );
    },
    [conversationId, currentUserId, scrollToBottom, transform],
  );

  const retry = useCallback(
    async (failed: ThreadMessage) => {
      const tempId = failed.tempId;
      if (!tempId) return;
      transform((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...m, pending: "sending" } : m)),
      );
      const result = await sendMessage({ conversationId, body: failed.body });
      if (!result.ok) {
        transform((prev) =>
          prev.map((m) =>
            m.tempId === tempId ? { ...m, pending: "failed" } : m,
          ),
        );
        toast.error(result.error);
        return;
      }
      transform((prev) =>
        prev.map((m) =>
          m.tempId === tempId ? { ...result.message, tempId } : m,
        ),
      );
    },
    [conversationId, transform],
  );

  const dismiss = useCallback(
    (failed: ThreadMessage) => {
      if (!failed.tempId) return;
      transform((prev) => prev.filter((m) => m.tempId !== failed.tempId));
    },
    [transform],
  );

  const onSubmit = useCallback(() => {
    const text = draft;
    setDraft("");
    void doSend(text);
  }, [draft, doSend]);

  // Subscribe to new messages on this conversation. RLS is the authorization
  // boundary: Realtime evaluates the `messages` SELECT policy against our JWT, so
  // a non-participant never receives these rows. On reconnect, catch up the gap.
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => ingest(payload.new as Message),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (sawDropRef.current) {
            sawDropRef.current = false;
            void catchUp();
          }
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          sawDropRef.current = true;
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [catchUp, conversationId, ingest, supabase]);

  // Keep the realtime socket's JWT fresh. Access tokens expire (~1h); without
  // re-auth the server drops the stale token and a long-open thread goes silent.
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

  // Refocus / regain network → reconcile any messages we missed.
  useEffect(() => {
    const trigger = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    window.addEventListener("focus", trigger);
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", trigger);
    return () => {
      window.removeEventListener("focus", trigger);
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", trigger);
    };
  }, [catchUp]);

  // Track whether the reader is near the bottom (drives smart auto-scroll).
  useEffect(() => {
    const onScroll = () => {
      const dist =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      atBottomRef.current = dist <= NEAR_BOTTOM_PX;
      if (atBottomRef.current) setShowNewPill(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On open: jump to the latest message (DOM sync, no state) and clear the unread
  // badge. Mount-only — deps would re-fire on every keystroke.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
    void markConversationRead(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex-1 space-y-3 py-6">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const sending = m.pending === "sending";
          const failed = m.pending === "failed";
          return (
            <div
              key={m.tempId ?? m.id}
              className={cn("flex flex-col", mine ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm transition-opacity",
                  mine
                    ? "rounded-tr-sm bg-brand text-white"
                    : "rounded-tl-sm bg-slate-100 text-slate-800",
                  sending && "opacity-70",
                  failed && "ring-1 ring-danger/40",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              {failed ? (
                <span className="mt-1 flex items-center gap-2 px-1 text-xs text-danger">
                  Failed to send
                  <button
                    type="button"
                    onClick={() => retry(m)}
                    className="font-medium underline hover:no-underline"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(m)}
                    className="text-slate-400 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </span>
              ) : (
                <span className="mt-1 px-1 text-xs text-slate-400">
                  {sending ? "Sending…" : timeFmt.format(new Date(m.created_at))}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {showNewPill && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-brand shadow-md transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          New messages ↓
        </button>
      )}

      <div className="sticky bottom-0 border-t border-border bg-bg/85 py-4 backdrop-blur">
        <MessageComposer value={draft} onChange={setDraft} onSubmit={onSubmit} />
      </div>
    </>
  );
}
