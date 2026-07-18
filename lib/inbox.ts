// Shared inbox loader — used by the full Messages page AND the docked messaging
// panel (app layout), so both agree on rows, snippets, and unread counts.

import type { SupabaseClient } from "@supabase/supabase-js";

// Display-ready row shaped server-side so the client components stay
// presentational + live. Live message events only need to patch snippet / time
// / unread / order.
export type InboxRowVM = {
  id: string;
  otherName: string;
  otherInitial: string;
  listingTitle: string;
  lastMessageAt: string;
  snippet: { body: string; senderId: string } | null;
  unread: number;
};

type Party = { display_name: string | null; org_name: string | null } | null;
type InboxRow = {
  id: string;
  buyer_id: string;
  owner_id: string;
  last_message_at: string;
  listing: { title: string } | null;
  buyer: Party;
  owner: Party;
};

const partyName = (p: Party) =>
  p?.display_name || p?.org_name || "Spiral Nexus user";

// Conversations (RLS-scoped to the user's own) + the latest message per thread
// (snippet) + unread count for this user. Unread = messages after our
// last_read_at marker that we didn't send.
export async function loadInboxRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<InboxRowVM[]> {
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, owner_id, last_message_at, listing:ip_assets(title), buyer:profiles!conversations_buyer_id_fkey(display_name, org_name), owner:profiles!conversations_owner_id_fkey(display_name, org_name)",
    )
    .order("last_message_at", { ascending: false });
  const conversations = (data ?? []) as unknown as InboxRow[];
  if (!conversations.length) return [];

  const ids = conversations.map((c) => c.id);
  const [{ data: msgs }, { data: reads }] = await Promise.all([
    supabase
      .from("messages")
      .select("conversation_id, body, sender_id, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversation_reads")
      .select("conversation_id, last_read_at")
      .in("conversation_id", ids),
  ]);

  const snippets: Record<string, { body: string; sender_id: string }> = {};
  const unread: Record<string, number> = {};
  const lastRead: Record<string, string> = {};
  for (const r of reads ?? []) lastRead[r.conversation_id] = r.last_read_at;
  for (const m of msgs ?? []) {
    if (!snippets[m.conversation_id]) {
      snippets[m.conversation_id] = { body: m.body, sender_id: m.sender_id };
    }
    const seenAt = lastRead[m.conversation_id];
    if (m.sender_id !== userId && (!seenAt || m.created_at > seenAt)) {
      unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
    }
  }

  return conversations.map((c) => {
    const other = userId === c.buyer_id ? c.owner : c.buyer;
    const name = partyName(other);
    const snip = snippets[c.id];
    return {
      id: c.id,
      otherName: name,
      otherInitial: name.charAt(0).toUpperCase(),
      listingTitle: c.listing?.title ?? "Listing removed",
      lastMessageAt: c.last_message_at,
      snippet: snip ? { body: snip.body, senderId: snip.sender_id } : null,
      unread: unread[c.id] ?? 0,
    };
  });
}
