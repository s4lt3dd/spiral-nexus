"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NexusMark } from "@/components/brand/nexus-mark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <NexusMark className="size-7" />
        <span className="font-display text-lg font-medium tracking-[-0.02em] text-ink">
          Spiral Nexus
        </span>
      </Link>

      <div className="animate-rise mt-8 w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-md">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
              <MailCheck className="size-6" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-2xl font-medium text-ink">
              Check your inbox
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              We sent a secure sign-in link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Open
              it in this browser to continue.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-6 text-sm font-medium text-brand hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-medium text-ink">
              Sign in to Spiral Nexus
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;ll email you a secure sign-in link — no password needed.
            </p>

            <form onSubmit={signIn} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-invalid={!!error}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending…" : "Send sign-in link"}
              </Button>
              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        New here? Signing in creates your account.
      </p>
    </main>
  );
}
