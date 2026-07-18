import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/profile";
import { SiteHeader } from "@/components/marketing/site-header";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = { title: "Edit profile · Spiral Nexus" };

export default async function EditProfilePage() {
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
  if (!profileRow) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <div className="animate-rise">
          <p className="text-sm font-medium tracking-wide text-brand-text uppercase">
            Your profile
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold text-foreground">
            Edit profile
          </h1>
          <p className="mt-3 max-w-prose text-base text-slate-600">
            This is how you appear to other members and on your public profile.
          </p>
        </div>

        <div className="mt-10">
          <ProfileForm profile={profileRow as PublicProfile} />
        </div>
      </main>
    </div>
  );
}
