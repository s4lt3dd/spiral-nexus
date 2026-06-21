import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { MemberParams } from "@/lib/members";

function hrefFor(current: MemberParams, page: number): string {
  const p = new URLSearchParams();
  if (current.q) p.set("q", current.q);
  if (current.role) p.set("role", current.role);
  if (current.sector) p.set("sector", current.sector);
  if (current.jurisdiction) p.set("jurisdiction", current.jurisdiction);
  if (current.sort && current.sort !== "newest") p.set("sort", current.sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/network?${qs}` : "/network";
}

export function MembersPagination({
  current,
  pageCount,
}: {
  current: MemberParams;
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
