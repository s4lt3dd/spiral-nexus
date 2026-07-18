import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { recentNotifications } from "@/lib/engagement";
import { loadInboxRows } from "@/lib/inbox";
import { SiteHeader } from "@/components/marketing/site-header";
import { InboxList } from "@/components/messages/inbox-list";
import { NotificationsPanel } from "@/components/messages/notifications-panel";

export const metadata = { title: "Messages · Spiral Nexus" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Inbox rows (RLS-scoped) and notifications (likes on the user's listings +
  // new followers) are independent — fetch both concurrently.
  const [rows, notifications] = await Promise.all([
    loadInboxRows(supabase, user.id),
    recentNotifications(supabase, user.id),
  ]);

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Messages
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Conversations about your listings and the marks you&apos;ve enquired
          about.
        </p>

        <InboxList currentUserId={user.id} initialRows={rows} />

        <NotificationsPanel items={notifications} />
      </main>
    </div>
  );
}
