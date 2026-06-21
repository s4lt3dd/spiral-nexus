"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Toggle-chip multi-select. Used across onboarding + the edit form for roles,
// sectors, jurisdictions, and Nice classes. Controlled.
export function ChipMultiSelect<T extends string | number>({
  options,
  selected,
  onToggle,
  className,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  className?: string;
}) {
  const set = new Set(selected);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = set.has(o.value);
        return (
          <button
            type="button"
            key={String(o.value)}
            onClick={() => onToggle(o.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25",
              active
                ? "border-brand/40 bg-brand-tint text-brand"
                : "border-border bg-surface text-slate-600 hover:bg-slate-50",
            )}
          >
            {active && <Check className="size-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
