"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Map a validated payload to the columns a user is allowed to control. Note
// what is NOT here: verified, subscription_tier, stripe_customer_id — never
// user-editable (no self-verify, no self-upgrade). The column-level UPDATE
// grant in the migration is the real backstop; this is defence in depth.
function toRow(values: ReturnType<typeof profileSchema.parse>) {
  return {
    display_name: values.display_name ?? null,
    org_name: values.org_name ?? null,
    headline: values.headline ?? null,
    bio: values.bio ?? null,
    location: values.location ?? null,
    avatar_url: values.avatar_url ?? null,
    website: values.website ?? null,
    linkedin_url: values.linkedin_url ?? null,
    role_flags: values.role_flags,
    sectors: values.sectors,
    jurisdictions: values.jurisdictions,
    nice_class_interests: values.nice_class_interests,
  };
}

async function saveProfile(
  input: ProfileInput,
  opts: { markOnboarded: boolean },
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const row = toRow(parsed.data);
  const patch = opts.markOnboarded
    ? { ...row, onboarded_at: new Date().toISOString() }
    : row;

  // Scope to this user's own row — the id comes from auth.uid(), never the
  // payload. RLS + the column grant are the security boundary; this is the API.
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile/edit");
  revalidatePath(`/u/${user.id}`);
  return { ok: true };
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  return saveProfile(input, { markOnboarded: false });
}

export async function completeOnboarding(
  input: ProfileInput,
): Promise<ActionResult> {
  return saveProfile(input, { markOnboarded: true });
}

// Skip onboarding: stamp onboarded_at only. We never trap a user behind a form
// — the completion nudge recovers profile completeness later.
export async function skipOnboarding(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
