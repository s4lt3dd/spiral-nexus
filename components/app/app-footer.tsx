import Link from "next/link";

import { appFooterNav } from "@/lib/nav";

// Slim footer rendered on every signed-in page (via app/(app)/layout.tsx) so
// legal pages stay reachable from inside the product. Data-driven from
// `appFooterNav` — add links there, never in this JSX.
export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 sm:flex-row">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Spiral Nexus
        </p>
        <nav className="flex items-center gap-5">
          {appFooterNav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-slate-500 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
