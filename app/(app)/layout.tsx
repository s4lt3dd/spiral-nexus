import { SiteFooter } from "@/components/marketing/site-footer";
import { createClient } from "@/lib/supabase/server";
import { loadInboxRows } from "@/lib/inbox";
import { MessagingDock } from "@/components/messages/messaging-dock";

// Wraps the authenticated product surface. Each page renders its own
// SiteHeader and owns its main content; this layout adds the shared footer and
// the persistent docked messaging panel (fixed, so it never affects flow).
// The layout persists across in-app navigation, so the dock mounts once and
// stays live via realtime instead of remounting on every page change.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rows = user ? await loadInboxRows(supabase, user.id) : [];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <SiteFooter />
      {user && (
        <MessagingDock currentUserId={user.id} initialRows={rows} />
      )}
    </div>
  );
}
