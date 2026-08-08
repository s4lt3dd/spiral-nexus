import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ListingsPagination } from "@/components/listings/listings-pagination";
import { discoveryParamsSchema } from "@/lib/discovery";

const params = (input: Record<string, unknown> = {}) =>
  discoveryParamsSchema.parse(input);

const hrefOf = (name: RegExp) =>
  screen.getByRole("link", { name }).getAttribute("href");

describe("ListingsPagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <ListingsPagination current={params()} pageCount={1} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no results at all", () => {
    const { container } = render(
      <ListingsPagination current={params()} pageCount={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current position", () => {
    render(<ListingsPagination current={params({ page: "2" })} pageCount={5} />);
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("exposes an accessible pagination landmark", () => {
    render(<ListingsPagination current={params()} pageCount={3} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });

  it("disables Previous on the first page and removes it from the tab order", () => {
    render(<ListingsPagination current={params()} pageCount={3} />);

    const prev = screen.getByRole("link", { name: /previous/i });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(prev).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("disables Next on the last page", () => {
    render(<ListingsPagination current={params({ page: "3" })} pageCount={3} />);

    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  // A hand-edited ?page=99 must not render "Page 99 of 3" with a dead Next.
  it("clamps a page beyond the last one", () => {
    render(<ListingsPagination current={params({ page: "99" })} pageCount={3} />);

    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("omits page=1 from the first-page link so the canonical URL is clean", () => {
    render(<ListingsPagination current={params({ page: "2" })} pageCount={3} />);
    expect(hrefOf(/previous/i)).toBe("/listings");
  });

  // Losing the filters on page 2 is the classic pagination regression.
  it("carries every active filter into both links", () => {
    render(
      <ListingsPagination
        current={params({
          q: "nimbus",
          nice_class: "9",
          jurisdiction: "United Kingdom",
          deal_type: "license",
          sort: "price_asc",
          page: "2",
        })}
        pageCount={5}
      />,
    );

    for (const href of [hrefOf(/previous/i), hrefOf(/next/i)]) {
      const qs = new URLSearchParams(href!.split("?")[1]);
      expect(qs.get("q")).toBe("nimbus");
      expect(qs.get("nice_class")).toBe("9");
      expect(qs.get("jurisdiction")).toBe("United Kingdom");
      expect(qs.get("deal_type")).toBe("license");
      expect(qs.get("sort")).toBe("price_asc");
    }

    expect(new URLSearchParams(hrefOf(/next/i)!.split("?")[1]).get("page")).toBe("3");
    expect(new URLSearchParams(hrefOf(/previous/i)!.split("?")[1]).get("page")).toBeNull();
  });

  it("omits the default sort from the URL", () => {
    render(<ListingsPagination current={params({ page: "2" })} pageCount={3} />);
    expect(hrefOf(/next/i)).not.toContain("sort=");
  });
});
