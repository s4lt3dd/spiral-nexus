"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listingSchema, type ListingInput } from "@/lib/validation/listing";
import { listingAllowance } from "@/lib/listings";
import type { Tier } from "@/lib/tiers";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Map a validated payload to the columns we let users control. owner_id, type
// and source are set server-side below - never trusted from the client.
function toRow(values: ReturnType<typeof listingSchema.parse>) {
  return {
    title: values.title,
    description: values.description ?? null,
    jurisdiction: values.jurisdiction ?? null,
    registration_number: values.registration_number ?? null,
    status: values.status ?? null,
    nice_classes: values.nice_classes,
    deal_type: values.deal_type,
    asking_price: values.asking_price ?? null,
    currency: values.currency,
    office_url: values.office_url ?? null,
    territory: values.territory,
    filing_date: values.filing_date ?? null,
    license_duration: values.license_duration ?? null,
    license_renewable: values.license_renewable,
    encumbrances: values.encumbrances ?? null,
    quality_control: values.quality_control ?? null,
    certificate_path: values.certificate_path ?? null,
    images: values.images,
    mark_image_url: values.mark_image_url ?? null,
    is_published: values.is_published,
  };
}

// A certificate path must live in the caller's own Storage folder — otherwise
// a crafted payload could point a listing at someone else's document.
function ownsUploadPath(path: string | undefined, userId: string): boolean {
  return path === undefined || path.startsWith(`${userId}/`);
}

export async function createListing(input: ListingInput): Promise<ActionResult> {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  if (!ownsUploadPath(parsed.data.certificate_path, user.id)) {
    return { ok: false, error: "Invalid certificate reference." };
  }

  // Enforce the listing cap server-side. The UI is never the boundary.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const allowance = listingAllowance((profile?.subscription_tier ?? "entry") as Tier);
  if (allowance !== null) {
    const { count } = await supabase
      .from("ip_assets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if ((count ?? 0) >= allowance) {
      return {
        ok: false,
        error: `You've reached your limit of ${allowance} listings.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("ip_assets")
    .insert({
      ...toRow(parsed.data),
      owner_id: user.id,
      type: "trademark",
      source: "user_submitted",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function updateListing(
  id: string,
  input: ListingInput,
): Promise<ActionResult> {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  if (!ownsUploadPath(parsed.data.certificate_path, user.id)) {
    return { ok: false, error: "Invalid certificate reference." };
  }

  // Scope the update to this owner's row. RLS is the backstop; this fails fast.
  const { data, error } = await supabase
    .from("ip_assets")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Listing not found." };

  revalidatePath("/dashboard");
  revalidatePath(`/listings/${id}/edit`);
  return { ok: true, id: data.id };
}

export async function setListingPublished(
  id: string,
  isPublished: boolean,
): Promise<ActionResult> {
  // Server-action args arrive serialized; don't trust their runtime types.
  if (typeof id !== "string" || typeof isPublished !== "boolean") {
    return { ok: false, error: "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase
    .from("ip_assets")
    .update({ is_published: isPublished })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Listing not found." };

  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function deleteListing(id: string): Promise<ActionResult> {
  if (typeof id !== "string") return { ok: false, error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("ip_assets")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, id };
}
