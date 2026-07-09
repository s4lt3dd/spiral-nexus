"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type LikeResult =
  | { ok: true; liked: boolean }
  | { ok: false; error: string };

const uuid = z.string().uuid();

export async function likeListing(listingId: string): Promise<LikeResult> {
  if (!uuid.safeParse(listingId).success) {
    return { ok: false, error: "Invalid listing." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Visibility check mirrors saves: you can only like what you can see (RLS
  // hides other people's drafts, so a guessed draft id resolves to nothing).
  const { data: visible } = await supabase
    .from("ip_assets")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();
  if (!visible) return { ok: false, error: "Listing not found." };

  // Idempotent: a duplicate/optimistic double-like is a no-op.
  const { error } = await supabase
    .from("listing_likes")
    .upsert(
      { user_id: user.id, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/saved");
  return { ok: true, liked: true };
}

export async function unlikeListing(listingId: string): Promise<LikeResult> {
  if (!uuid.safeParse(listingId).success) {
    return { ok: false, error: "Invalid listing." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Scoped to the caller's own row; RLS is the backstop.
  const { error } = await supabase
    .from("listing_likes")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/saved");
  return { ok: true, liked: false };
}
