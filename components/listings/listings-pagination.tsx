import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { DiscoveryParams } from "@/lib/discovery";

function hrefFor(current: DiscoveryParams, page: number): string {
  const p = new URLSearchParams();
  if (current.q) p.set("q", current.q);
  if (current.nice_class) p.set("nice_class", String(current.nice_class));
  if (current.jurisdiction) p.set("jurisdiction", current.jurisdiction);
  if (current.deal_type) p.set("deal_type", current.deal_type);
  if (current.sort && current.sort !== "newest") p.set("sort", current.sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

export function ListingsPagination({
  current,
  pageCount,
}: {
  current: DiscoveryParams;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const page = Math.min(current.page, pageCount);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      className="mt-10 flex items-center justify-between"
      aria-label="Pagination"
    >
      <Link
        href={hrefFor(current, page - 1)}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          prevDisabled && "pointer-events-none opacity-50",
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Previous
      </Link>

      <span className="text-sm text-slate-500">
        Page {page} of {pageCount}
      </span>

      <Link
        href={hrefFor(current, page + 1)}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          nextDisabled && "pointer-events-none opacity-50",
        )}
      >
        Next
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
