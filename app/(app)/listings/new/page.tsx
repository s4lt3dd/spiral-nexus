import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata = { title: "New listing · Spiral Nexus" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to dashboard
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            List a trademark
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Save it as a draft while you refine it, or publish it for buyers to
            discover.
          </p>
        </header>

        <ListingForm />
      </main>
    </div>
  );
}
