"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

import type { CompletenessResult } from "@/lib/profile";
import { CompletenessMeter } from "@/components/profile/completeness-meter";
import { NexusMark } from "@/components/brand/nexus-mark";

const STORAGE_KEY = "sn:profile-nudge-dismissed";

// Tiny external store over localStorage so we can read dismissal without a
// setState-in-effect, and re-render the same tab on dismiss.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function dismissNudge(percent: number) {
  localStorage.setItem(STORAGE_KEY, String(percent));
  listeners.forEach((l) => l());
}

// Dismissible completion nudge for existing users. Shown on the home page when
// the profile is incomplete; remembers dismissal per-browser (keyed by the
// percent at dismissal, so a later improvement won't re-surface stale advice).
// We never block the app on this — signups/LOIs matter more than 100%.
export function ProfileNudge({ result }: { result: CompletenessResult }) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY) === String(result.percent),
    () => false,
  );

  if (result.percent >= 100 || dismissed) return null;

  return (
    <div className="animate-rise relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm">
      <NexusMark className="pointer-events-none absolute -top-8 -right-8 size-40 opacity-[0.05]" />
      <button
        type="button"
        onClick={() => dismissNudge(result.percent)}
        aria-label="Dismiss"
        className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="relative max-w-md">
        <h2 className="font-display text-lg font-medium text-ink">
          Finish your profile
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          A complete profile builds trust and helps the right buyers, licensees,
          and investors find you.
        </p>
        <CompletenessMeter result={result} className="mt-5" />
      </div>
    </div>
  );
}
