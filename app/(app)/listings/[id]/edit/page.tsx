import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app/app-header";
import { ListingForm } from "@/components/listings/listing-form";
import type { IpAsset } from "@/lib/types";

export const metadata = { title: "Edit listing · Spiral Nexus" };

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already restricts this to rows the user may read; the owner_id filter
  // makes the "not yours" case a clean 404 rather than leaking existence.
  const { data: listing } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!listing) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} />

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
            Edit listing
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Update the details, then save as a draft or publish your changes.
          </p>
        </header>

        <ListingForm listing={listing as IpAsset} />
      </main>
    </div>
  );
}
