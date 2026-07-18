import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { recentNotifications } from "@/lib/engagement";
import { SiteHeader } from "@/components/marketing/site-header";
import { InboxList, type InboxRowVM } from "@/components/messages/inbox-list";
import { NotificationsPanel } from "@/components/messages/notifications-panel";

export const metadata = { title: "Messages · Spiral Nexus" };

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

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Conversations (RLS-scoped to the user's own) and their notifications
  // (likes on their listings + new followers) are independent — fetch both
  // concurrently.
  const [{ data }, notifications] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, buyer_id, owner_id, last_message_at, listing:ip_assets(title), buyer:profiles!conversations_buyer_id_fkey(display_name, org_name), owner:profiles!conversations_owner_id_fkey(display_name, org_name)",
      )
      .order("last_message_at", { ascending: false }),
    recentNotifications(supabase, user.id),
  ]);
  const conversations = (data ?? []) as unknown as InboxRow[];

  // The latest message per conversation (snippet) + how many are unread for this
  // user. Both are derived from one pass over the messages; unread = messages
  // after our last_read_at marker that we didn't send.
  const snippets: Record<string, { body: string; sender_id: string }> = {};
  const unread: Record<string, number> = {};
  if (conversations.length) {
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
    const lastRead: Record<string, string> = {};
    for (const r of reads ?? []) lastRead[r.conversation_id] = r.last_read_at;
    for (const m of msgs ?? []) {
      if (!snippets[m.conversation_id]) {
        snippets[m.conversation_id] = { body: m.body, sender_id: m.sender_id };
      }
      const seenAt = lastRead[m.conversation_id];
      if (m.sender_id !== user.id && (!seenAt || m.created_at > seenAt)) {
        unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
      }
    }
  }

  const rows: InboxRowVM[] = conversations.map((c) => {
    const other = user.id === c.buyer_id ? c.owner : c.buyer;
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

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Messages
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Conversations about your listings and the marks you&apos;ve enquired
          about.
        </p>

        <InboxList currentUserId={user.id} initialRows={rows} />

        <NotificationsPanel items={notifications} />
      </main>
    </div>
  );
}
