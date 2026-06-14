import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { NexusMark } from "@/components/brand/nexus-mark";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Browse" },
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Plans" },
];

// Shared public top nav. `authed` is passed only by dynamic pages (e.g.
// /listings) so the static marketing pages can stay static — they render the
// default ("Sign in") without a per-request auth lookup.
export function SiteHeader({ authed = false }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <NexusMark className="size-7" />
          <span className="font-display text-lg font-medium tracking-[-0.02em] text-ink">
            Spiral Nexus
          </span>
        </Link>

        <nav className="hidden items-center gap-7 sm:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href={authed ? "/dashboard" : "/login"}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          {authed ? "Dashboard" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}
