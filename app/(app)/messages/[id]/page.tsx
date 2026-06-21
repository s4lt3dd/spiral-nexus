import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";
import { SiteHeader } from "@/components/marketing/site-header";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata = { title: "Conversation · Spiral Nexus" };

type Party = { display_name: string | null; org_name: string | null } | null;
const partyName = (p: Party) =>
  p?.display_name || p?.org_name || "Spiral Nexus user";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns the row only to its two participants; anyone else gets null.
  const { data: convo } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, owner_id, listing:ip_assets(id, title), buyer:profiles!conversations_buyer_id_fkey(display_name, org_name), owner:profiles!conversations_owner_id_fkey(display_name, org_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!convo) notFound();

  const c = convo as unknown as {
    id: string;
    buyer_id: string;
    owner_id: string;
    listing: { id: string; title: string } | null;
    buyer: Party;
    owner: Party;
  };

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  const messages = (msgs ?? []) as Message[];

  const isBuyer = user.id === c.buyer_id;
  const other = isBuyer ? c.owner : c.buyer;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader email={user.email} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All messages
        </Link>

        <header className="mt-4 flex items-center gap-3 border-b border-border pb-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand">
            {partyName(other).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-medium text-ink">
              {partyName(other)}
            </h1>
            <p className="truncate text-sm text-slate-500">
              {c.listing ? (
                <Link
                  href={`/listings/${c.listing.id}`}
                  className="hover:text-foreground hover:underline"
                >
                  {c.listing.title}
                </Link>
              ) : (
                "Listing removed"
              )}
            </p>
          </div>
        </header>

        <MessageThread
          conversationId={c.id}
          currentUserId={user.id}
          initialMessages={messages}
        />
      </main>
    </div>
  );
}
