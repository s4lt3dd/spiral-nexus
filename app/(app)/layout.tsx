import { SiteFooter } from "@/components/marketing/site-footer";

// Wraps the authenticated product surface. Each page renders its own
// SiteHeader and owns its main content; this layout adds the shared footer
// (the same one used on marketing pages — one footer everywhere) so Privacy,
// Terms, and the rest stay reachable from inside the app.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
