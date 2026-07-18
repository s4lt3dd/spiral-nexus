import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Avatar with the gold verified-ring motif (the only routine use of gold).
export function VerifiedAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-tint font-display text-sm font-medium text-brand-text ring-2 ring-gold ring-offset-2 ring-offset-surface">
        {initials}
      </span>
      <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-gold text-white ring-2 ring-surface">
        <Check className="size-2.5" aria-hidden />
      </span>
    </span>
  );
}
