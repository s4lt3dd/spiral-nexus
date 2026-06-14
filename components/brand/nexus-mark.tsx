import { cn } from "@/lib/utils";

// The Spiral Nexus signature: faint concentric rings with an offset spiral
// gap, echoing the brand. Used as a low-opacity flourish in placeholders,
// empty states, and the wordmark lockup. Decorative only.
export function NexusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={cn("text-brand", className)}
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="32" cy="32" r="6" opacity="0.9" />
        <path d="M32 14a18 18 0 1 1-18 18" opacity="0.75" />
        <path d="M32 4a28 28 0 1 1-28 28" opacity="0.5" />
        <path d="M32 24a8 8 0 1 0 8 8" opacity="0.6" />
      </g>
    </svg>
  );
}
