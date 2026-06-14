import Link from "next/link";
import { NexusMark } from "@/components/brand/nexus-mark";
import { SiteHeader } from "@/components/marketing/site-header";

// Browse is sign-in-only, so it's intentionally absent from the public footer.
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Plans" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <NexusMark className="size-5" />
            <span className="font-display text-sm font-medium text-ink">
              Spiral Nexus
            </span>
          </div>
          <p className="text-sm text-slate-500">
            The marketplace for intellectual property.
          </p>
          <nav className="flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-slate-500 transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
