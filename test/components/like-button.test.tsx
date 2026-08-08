import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Server actions and the toast portal are the component's two side effects;
// both are stubbed so this stays a pure client-render test.
const likeListing = vi.fn();
const unlikeListing = vi.fn();
const toastError = vi.fn();

vi.mock("@/app/(app)/listings/like-actions", () => ({
  likeListing: (...args: unknown[]) => likeListing(...args),
  unlikeListing: (...args: unknown[]) => unlikeListing(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const { LikeButton } = await import("@/components/listings/like-button");

const button = () => screen.getByRole("button");

beforeEach(() => {
  likeListing.mockResolvedValue({ ok: true, liked: true });
  unlikeListing.mockResolvedValue({ ok: true, liked: false });
});

describe("LikeButton — rendering", () => {
  it("shows the count with an accessible label when unliked", () => {
    render(<LikeButton listingId="L1" initialLiked={false} initialCount={3} />);

    expect(button()).toHaveAccessibleName("Like listing");
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("reflects the liked state from the server", () => {
    render(<LikeButton listingId="L1" initialLiked initialCount={3} />);

    expect(button()).toHaveAccessibleName("Unlike listing");
    expect(button()).toHaveAttribute("aria-pressed", "true");
  });

  it("renders a labelled variant for the detail page", () => {
    render(
      <LikeButton listingId="L1" initialLiked={false} initialCount={7} showLabel />,
    );

    expect(button()).toHaveTextContent("Like");
    expect(button()).toHaveTextContent("7");
    expect(button()).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the label to 'Liked' in the labelled variant", () => {
    render(<LikeButton listingId="L1" initialLiked initialCount={7} showLabel />);

    expect(button()).toHaveTextContent("Liked");
    expect(button()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("LikeButton — liking", () => {
  it("optimistically increments and calls the like action", async () => {
    const user = userEvent.setup();
    render(<LikeButton listingId="L1" initialLiked={false} initialCount={3} />);

    await user.click(button());

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(likeListing).toHaveBeenCalledWith("L1");
    expect(unlikeListing).not.toHaveBeenCalled();
  });

  it("optimistically decrements and calls the unlike action", async () => {
    const user = userEvent.setup();
    render(<LikeButton listingId="L1" initialLiked initialCount={3} />);

    await user.click(button());

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(unlikeListing).toHaveBeenCalledWith("L1");
  });

  it("never shows a negative count", async () => {
    const user = userEvent.setup();
    render(<LikeButton listingId="L1" initialLiked initialCount={0} />);

    await user.click(button());

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("adopts the server's answer when it disagrees with the optimistic guess", async () => {
    // Idempotent upsert: liking something already liked comes back liked=true.
    likeListing.mockResolvedValue({ ok: true, liked: true });
    const user = userEvent.setup();
    render(<LikeButton listingId="L1" initialLiked={false} initialCount={3} />);

    await user.click(button());

    expect(button()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("LikeButton — failure handling", () => {
  it("rolls back the count and state, and surfaces the error", async () => {
    likeListing.mockResolvedValue({ ok: false, error: "You must be signed in." });
    const user = userEvent.setup();
    render(<LikeButton listingId="L1" initialLiked={false} initialCount={3} />);

    await user.click(button());

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(toastError).toHaveBeenCalledWith("You must be signed in.");
  });

  it("rolls an unlike back to liked", async () => {
    unlikeListing.mockResolvedValue({ ok: false, error: "Listing not found." });
    const user = userEvent.setup();
    render(<LikeButton listingId="L1" initialLiked initialCount={5} />);

    await user.click(button());

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(toastError).toHaveBeenCalledWith("Listing not found.");
  });
});

describe("LikeButton — overlaid on a clickable card", () => {
  // The button is rendered on top of a card-wide link; a click must not
  // navigate to the listing.
  it("does not let the click reach the surrounding card", async () => {
    const onCardClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={onCardClick}>
        <LikeButton listingId="L1" initialLiked={false} initialCount={1} />
      </div>,
    );

    await user.click(button());

    expect(onCardClick).not.toHaveBeenCalled();
    expect(likeListing).toHaveBeenCalledOnce();
  });
});
