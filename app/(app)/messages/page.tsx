import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";

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

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS limits this to conversations the user participates in.
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, owner_id, last_message_at, listing:ip_assets(title), buyer:profiles!conversations_buyer_id_fkey(display_name, org_name), owner:profiles!conversations_owner_id_fkey(display_name, org_name)",
    )
    .order("last_message_at", { ascending: false });
  const conversations = (data ?? []) as unknown as InboxRow[];

  // Latest message per conversation for the snippet.
  const snippets: Record<string, { body: string; sender_id: string }> = {};
  if (conversations.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, sender_id, created_at")
      .in(
        "conversation_id",
        conversations.map((c) => c.id),
      )
      .order("created_at", { ascending: false });
    for (const m of msgs ?? []) {
      if (!snippets[m.conversation_id]) {
        snippets[m.conversation_id] = { body: m.body, sender_id: m.sender_id };
      }
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Messages
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Conversations about your listings and the marks you&apos;ve enquired
          about.
        </p>

        {conversations.length === 0 ? (
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
        ) : (
          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {conversations.map((c) => {
              const other = user.id === c.buyer_id ? c.owner : c.buyer;
              const snip = snippets[c.id];
              const prefix = snip?.sender_id === user.id ? "You: " : "";
              return (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand">
                      {partyName(other).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-medium text-ink">
                          {partyName(other)}
                        </p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {timeAgo(c.last_message_at)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-slate-500">
                        {c.listing?.title ?? "Listing removed"}
                      </p>
                      {snip && (
                        <p className="mt-0.5 truncate text-sm text-slate-600">
                          {prefix}
                          {snip.body}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
