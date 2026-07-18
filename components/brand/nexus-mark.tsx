import Image from "next/image";

import { cn } from "@/lib/utils";

import mark from "@/public/brand/spiral-nexus-mark-white.png";

// The official Spiral Nexus woven-slat mark (white — the in-app variant per
// design-system/spiral-nexus/MASTER.md). Used in the header/footer lockups and
// as a low-opacity flourish in placeholders and empty states. Decorative only.
export function NexusMark({ className }: { className?: string }) {
  return (
    <Image
      src={mark}
      alt=""
      aria-hidden
      className={cn("object-contain", className)}
    />
  );
}
