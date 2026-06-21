"use server";

// Account data actions (Slice 6b): export-my-data and delete-my-account.
// This file is a server action module ("use server"): nothing here is bundled to
// the browser. The service-role client below is created lazily inside the delete
// action and is never exported, so the service-role key cannot reach the client.

import { createClient as createServiceClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/profile";

export type ExportResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

// GDPR export: gather the caller's OWN data through their RLS-scoped session, so
// the export can only ever contain the caller's data. Id comes from auth.uid().
export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const uid = user.id;

  const [profile, listings, conversations, messages, saved, follows] =
    await Promise.all([
      supabase.from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq("id", uid).maybeSingle(),
      supabase.from("ip_assets").select("*").eq("owner_id", uid),
      supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${uid},owner_id.eq.${uid}`),
      supabase.from("messages").select("*").eq("sender_id", uid),
      supabase.from("saved_listings").select("*").eq("user_id", uid),
      supabase
        .from("follows")
        .select("*")
        .or(`follower_id.eq.${uid},following_id.eq.${uid}`),
    ]);

  return {
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      account: { id: uid, email: user.email },
      profile: profile.data ?? null,
      listings: listings.data ?? [],
      conversations: conversations.data ?? [],
      messages_sent: messages.data ?? [],
      saved_listings: saved.data ?? [],
      follows: follows.data ?? [],
    },
  };
}

// Delete the caller's account and ALL their data. The id is derived from
// auth.uid() — this action takes no id parameter, so a crafted payload can never
// target another user. Deleting the auth user cascades to profiles and every
// dependent table (see docs/compliance/data-inventory.md).
export async function deleteMyAccount(
  confirmation: string,
): Promise<ActionResult> {
  if (confirmation !== "DELETE") {
    return { ok: false, error: 'Type DELETE to confirm.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, error: "Server is not configured for account deletion." };
  }

  const admin = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Scoped strictly to the authenticated user's OWN id. Cascades wipe all data.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };

  // Clear the now-orphaned session cookies.
  await supabase.auth.signOut();
  return { ok: true };
}
