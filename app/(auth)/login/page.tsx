"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NexusMark } from "@/components/brand/nexus-mark";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

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

  async function signInWithGoogle() {
    setOauthLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    // On success the browser redirects to Google, so we only land here on error.
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <NexusMark className="size-7" />
        <span className="font-display text-lg font-medium tracking-[-0.02em] text-foreground">
          Spiral Nexus
        </span>
      </Link>

      <div className="animate-rise mt-8 w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-md">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-text">
              <MailCheck className="size-6" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-2xl font-medium text-foreground">
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
              className="mt-6 text-sm font-medium text-brand-text hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-medium text-foreground">
              Sign in to Spiral Nexus
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Continue with Google or get a secure sign-in link by email — no
              password needed.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={signInWithGoogle}
              disabled={oauthLoading || loading}
              className="mt-6 w-full"
            >
              <GoogleIcon className="size-4" />
              {oauthLoading ? "Redirecting…" : "Continue with Google"}
            </Button>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

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
              <Button
                type="submit"
                disabled={loading || oauthLoading}
                className="w-full"
              >
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

      <p className="mt-3 max-w-xs text-center text-xs text-slate-400">
        By continuing you agree to our{" "}
        <Link
          href="/terms"
          className="font-medium text-brand-text hover:underline"
        >
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-brand-text hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
