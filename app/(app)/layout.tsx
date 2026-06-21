import { AppFooter } from "@/components/app/app-footer";

// Wraps the authenticated product surface. Each page renders its own
// SiteHeader and owns its main content; this layout adds the slim shared
// footer so Privacy, Terms, and Account stay reachable from inside the app.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}
