import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NexusMark } from "@/components/brand/nexus-mark";

// Authenticated top nav: quiet surface bar, Fraunces wordmark, sign-out.
export function AppHeader({ email }: { email?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <NexusMark className="size-7" />
          <span className="font-display text-lg font-medium tracking-[-0.02em] text-ink">
            Spiral Nexus
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/listings"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-foreground"
          >
            Browse
          </Link>
          {email && (
            <span className="hidden text-sm text-slate-500 sm:inline">
              {email}
            </span>
          )}
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
