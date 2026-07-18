import Link from "next/link";

import { cn } from "@/lib/utils";
import type { CompletenessResult } from "@/lib/profile";
import { buttonVariants } from "@/components/ui/button";

// Branded progress bar + the next things worth adding. Presentational; reused
// by the home card and the dismissible nudge.
export function CompletenessMeter({
  result,
  showMissing = true,
  className,
}: {
  result: CompletenessResult;
  showMissing?: boolean;
  className?: string;
}) {
  const { percent, missing } = result;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Profile strength</p>
          <p className="font-display text-2xl font-semibold text-foreground tabular-nums">
            {percent}%
          </p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div
            className="h-full rounded-full bg-[image:var(--gradient-brand)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {showMissing && missing.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {missing.slice(0, 4).map((m) => (
            <li
              key={m.key}
              className="flex items-center gap-2 text-sm text-slate-600"
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-brand/40"
                aria-hidden
              />
              {m.label}
            </li>
          ))}
        </ul>
      )}

      {percent < 100 && (
        <Link
          href="/dashboard/profile/edit"
          className={cn(buttonVariants({ size: "sm" }), "w-fit")}
        >
          Complete your profile
        </Link>
      )}
    </div>
  );
}
