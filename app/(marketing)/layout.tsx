import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { NexusMark } from "@/components/brand/nexus-mark";

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

          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            Sign in
          </Link>
        </div>
      </header>

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
