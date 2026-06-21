"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

const uuid = z.string().uuid();

export async function followUser(targetId: string): Promise<ActionResult> {
  if (!uuid.safeParse(targetId).success) {
    return { ok: false, error: "Invalid member." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // App-level self-guard (the DB also enforces no_self_follow).
  if (user.id === targetId) {
    return { ok: false, error: "You can't follow yourself." };
  }

  // Target must exist (FK would also reject, but this gives a clean message).
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Member not found." };

  // Idempotent: ON CONFLICT (follower_id, following_id) DO NOTHING.
  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_id: user.id, following_id: targetId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/u/${targetId}`);
  revalidatePath("/dashboard");
  revalidatePath("/network");
  return { ok: true, following: true };
}

export async function unfollowUser(targetId: string): Promise<ActionResult> {
  if (!uuid.safeParse(targetId).success) {
    return { ok: false, error: "Invalid member." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Scoped to the caller's own edge; RLS is the backstop.
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/u/${targetId}`);
  revalidatePath("/dashboard");
  revalidatePath("/network");
  return { ok: true, following: false };
}
