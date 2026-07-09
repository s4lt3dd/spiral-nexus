import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";
import { PUBLIC_PROFILE_COLUMNS, type ProfileRole } from "@/lib/profile";
import { OnboardingFlow } from "@/components/profile/onboarding-flow";

export const metadata = { title: "Welcome · Spiral Nexus" };

// First-sign-in onboarding. Sign-in-only (see protectedPrefixes). Already-
// onboarded users are bounced to their profile home.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();
  if (profileRow?.onboarded_at) redirect("/dashboard");

  const p = profileRow as PublicProfile | null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] px-6 py-12">
      <OnboardingFlow
        initial={{
          display_name: p?.display_name ?? "",
          headline: p?.headline ?? "",
          org_name: p?.org_name ?? "",
          location: p?.location ?? "",
          country: p?.country ?? "",
          avatar_url: p?.avatar_url ?? "",
          website: p?.website ?? "",
          linkedin_url: p?.linkedin_url ?? "",
          bio: p?.bio ?? "",
          role_flags: (p?.role_flags as ProfileRole[]) ?? [],
          sectors: p?.sectors ?? [],
          jurisdictions: p?.jurisdictions ?? [],
          nice_class_interests: p?.nice_class_interests ?? [],
        }}
      />
    </main>
  );
}
