"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  contactSchema,
  messageSchema,
  type ContactInput,
  type MessageInput,
} from "@/lib/validation/message";
import { DAILY_NEW_CONVERSATION_CAP, weeklyDmLimit } from "@/lib/messaging";
import type { Tier } from "@/lib/tiers";

export type MessageResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

// Returns an error string if the user is over their weekly DM limit, else null.
// Open (null limit) while payments are off.
async function dmLimitError(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();
  const limit = weeklyDmLimit((profile?.subscription_tier ?? "entry") as Tier);
  if (limit === null) return null;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", weekAgo);
  if ((count ?? 0) >= limit) {
    return `You've reached your weekly message limit (${limit}).`;
  }
  return null;
}

export async function startConversation(
  input: ContactInput,
): Promise<MessageResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { listingId, body } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Listing must be published; derive the owner server-side (never trust input).
  const { data: listing } = await supabase
    .from("ip_assets")
    .select("id, owner_id, is_published")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || !listing.is_published) {
    return { ok: false, error: "Listing not found." };
  }
  if (listing.owner_id === user.id) {
    return { ok: false, error: "This is your own listing." };
  }

  // Reuse an existing thread for this (listing, buyer) if one exists.
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  let conversationId: string;
  if (existing) {
    conversationId = existing.id;
  } else {
    // Anti-spam: cap new threads per account per day.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .gte("created_at", dayAgo);
    if ((count ?? 0) >= DAILY_NEW_CONVERSATION_CAP) {
      return {
        ok: false,
        error: "You've started too many new conversations today. Try again tomorrow.",
      };
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        owner_id: listing.owner_id,
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: error?.message ?? "Could not start conversation." };
    }
    conversationId = created.id;
  }

  const limitError = await dmLimitError(supabase, user.id);
  if (limitError) return { ok: false, error: limitError };

  const { error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (msgError) return { ok: false, error: msgError.message };

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true, conversationId };
}

export async function sendMessage(input: MessageInput): Promise<MessageResult> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { conversationId, body } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Must be a participant. RLS is the backstop; this fails fast with a clean error.
  const { data: convo } = await supabase
    .from("conversations")
    .select("id, buyer_id, owner_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo || (convo.buyer_id !== user.id && convo.owner_id !== user.id)) {
    return { ok: false, error: "Conversation not found." };
  }

  const limitError = await dmLimitError(supabase, user.id);
  if (limitError) return { ok: false, error: limitError };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true, conversationId };
}
