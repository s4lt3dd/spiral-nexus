// AUTH-GATED route — /registries is sign-in-only during the invite-only
// pre-launch (see protectedPrefixes). It only deep-links out to public registry
// search, so it could be opened to anon at Launch.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { RegistrySearch } from "@/components/registries/registry-search";

export const metadata = { title: "Official registries · Spiral Nexus" };

export default async function RegistriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <header className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Official registries
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
            Search the IP offices
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Check a name against the official trademark registries — USPTO,
            UKIPO, EUIPO, and WIPO — before you list or make contact.
          </p>
        </header>

        <div className="mt-8">
          <RegistrySearch />
        </div>
      </main>
    </div>
  );
}
