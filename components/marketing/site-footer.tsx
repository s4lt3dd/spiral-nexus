import Link from "next/link";

import { footerNav } from "@/lib/nav";
import { NexusMark } from "@/components/brand/nexus-mark";

// Data-driven footer. Slices add links by appending to `footerNav` in
// lib/nav.ts — never by editing this JSX.
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <NexusMark className="size-5" />
          <span className="font-display text-sm font-medium text-foreground">
            Spiral Nexus
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Discover | Connect | Commercialise
        </p>
        <nav className="flex items-center gap-6">
          {footerNav.map((l) => (
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
  );
}
