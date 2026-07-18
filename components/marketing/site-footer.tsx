"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { footerNavGuest, footerNavAuthed, footerLegal } from "@/lib/nav";
import { NexusMark } from "@/components/brand/nexus-mark";

// The single footer for the whole product — marketing and app both render this
// (one consistent structure everywhere; fixes the old marketing-vs-app footer
// mismatch). Auth-aware like SiteHeader: the primary link column swaps between
// visitor and signed-in destinations, while brand, tagline, legal links, and
// the company line stay constant. `email` mirrors SiteHeader's contract:
// string = known signed-in, null = known signed-out, undefined = hydrate.
export function SiteFooter({ email: initialEmail }: { email?: string | null }) {
  const [email, setEmail] = useState<string | null>(initialEmail ?? null);

  useEffect(() => {
    const supabase = createClient();
    if (initialEmail === undefined) {
      supabase.auth
        .getUser()
        .then(({ data }) => setEmail(data.user?.email ?? null));
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [initialEmail]);

  const authed = !!email;
  const primary = authed ? footerNavAuthed : footerNavGuest;

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <NexusMark className="size-5" />
            <span className="font-display text-sm font-medium text-foreground">
              Spiral Nexus
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Discover · Connect · Commercialise
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[...primary, ...footerLegal].map((l) => (
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
        <div className="mt-6 border-t border-border pt-5 text-center text-xs text-slate-500 sm:text-left">
          © {new Date().getFullYear()} Spiral Nexus Ltd · London
        </div>
      </div>
    </footer>
  );
}
