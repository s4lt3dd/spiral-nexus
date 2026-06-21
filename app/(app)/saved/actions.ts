"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

const uuid = z.string().uuid();

export async function saveListing(listingId: string): Promise<ActionResult> {
  if (!uuid.safeParse(listingId).success) {
    return { ok: false, error: "Invalid listing." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Visibility check: only let a user save a listing they can actually see.
  // RLS on ip_assets returns a row only if it's published (or their own), so a
  // guessed draft id resolves to nothing and can't be saved.
  const { data: visible } = await supabase
    .from("ip_assets")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();
  if (!visible) return { ok: false, error: "Listing not found." };

  // Idempotent: ON CONFLICT (user_id, listing_id) DO NOTHING, so a duplicate or
  // optimistic double-save is a no-op rather than a PK-violation error.
  const { error } = await supabase
    .from("saved_listings")
    .upsert(
      { user_id: user.id, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/saved");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, saved: true };
}

export async function unsaveListing(listingId: string): Promise<ActionResult> {
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
    .from("saved_listings")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/saved");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true, saved: false };
}
