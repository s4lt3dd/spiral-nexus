"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { appNav, marketingNav, accountMenu } from "@/lib/nav";
import { buttonVariants } from "@/components/ui/button";
import { NexusMark } from "@/components/brand/nexus-mark";

// Single auth-aware top nav used across the whole app.
// `email`:
//   - string    -> known signed-in (server pages pass it; no flash)
//   - null      -> known signed-out (dynamic pages pass it)
//   - undefined -> unknown; hydrate client-side (keeps static marketing static)
export function SiteHeader({ email: initialEmail }: { email?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(initialEmail ?? null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (initialEmail === undefined) {
      supabase.auth
        .getUser()
        .then(({ data }) => setEmail(data.user?.email ?? null));
    }
    // Keep the header in sync after sign in / sign out (incl. other tabs).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [initialEmail]);

  // Close the account menu on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const authed = !!email;

  async function signOut() {
    setOpen(false);
    await createClient().auth.signOut();
    setEmail(null);
    router.push("/");
    router.refresh();
  }

  // Browse is sign-in-only, so the authed nav appears only when signed in.
  // Signed-out visitors get the marketing links instead. Both come from config.
  const links = authed ? appNav : marketingNav;

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground [&_svg]:size-4 [&_svg]:text-slate-500";

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
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {authed ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface py-1 pr-2 pl-1 text-sm shadow-xs transition-colors outline-none hover:bg-slate-50 focus-visible:ring-[3px] focus-visible:ring-brand/25 aria-expanded:bg-slate-50"
            >
              <span className="flex size-7 items-center justify-center rounded-[6px] bg-brand-tint font-display text-xs font-medium text-brand">
                {email!.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[12rem] truncate text-slate-700 sm:inline">
                {email}
              </span>
              <ChevronDown className="size-4 text-slate-400" aria-hidden />
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
              >
                <p className="truncate px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {email}
                </p>
                <div className="my-1 h-px bg-border" />
                {accountMenu.map((item) => (
                  <Link
                    key={item.href}
                    role="menuitem"
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={itemClass}
                  >
                    {item.icon && <item.icon aria-hidden />}
                    {item.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className={cn(
                    itemClass,
                    "cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:text-destructive",
                  )}
                >
                  <LogOut aria-hidden />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
