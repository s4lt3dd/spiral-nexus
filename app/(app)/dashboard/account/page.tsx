import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { AccountActions } from "@/components/account/account-actions";

export const metadata = { title: "Account & data · Spiral Nexus" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <div className="animate-rise">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Account
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] font-semibold text-ink">
            Account &amp; data
          </h1>
          <p className="mt-3 max-w-prose text-base text-slate-600">
            Export your data or permanently delete your account. Signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>
        </div>

        <div className="mt-10">
          <AccountActions />
        </div>
      </main>
    </div>
  );
}
