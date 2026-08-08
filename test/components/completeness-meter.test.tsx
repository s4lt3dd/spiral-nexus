import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CompletenessMeter } from "@/components/profile/completeness-meter";
import { profileCompleteness } from "@/lib/profile";

const EMPTY = {
  display_name: null,
  org_name: null,
  headline: null,
  bio: null,
  avatar_url: null,
  location: null,
  role_flags: null,
  sectors: null,
  jurisdictions: null,
};

const FULL = {
  display_name: "Ada Lovelace",
  org_name: "Analytical",
  headline: "IP counsel",
  bio: "Twenty years in trademarks.",
  avatar_url: "https://example.com/a.png",
  location: "London",
  role_flags: ["owner"],
  sectors: ["Automotive"],
  jurisdictions: ["United Kingdom"],
};

const bar = () => screen.getByRole("progressbar");

describe("CompletenessMeter", () => {
  it("exposes the percentage on an accessible progress bar", () => {
    render(<CompletenessMeter result={profileCompleteness(EMPTY)} />);

    expect(bar()).toHaveAttribute("aria-valuenow", "0");
    expect(bar()).toHaveAttribute("aria-valuemin", "0");
    expect(bar()).toHaveAttribute("aria-valuemax", "100");
    expect(bar()).toHaveAccessibleName("Profile completeness");
  });

  it("shows the percentage as text too", () => {
    render(<CompletenessMeter result={profileCompleteness(FULL)} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("keeps the fill width in sync with the percentage", () => {
    const result = profileCompleteness({ ...EMPTY, display_name: "Ada" });
    render(<CompletenessMeter result={result} />);

    expect(bar().firstElementChild).toHaveStyle({ width: `${result.percent}%` });
  });

  it("lists the next steps for an incomplete profile", () => {
    render(<CompletenessMeter result={profileCompleteness(EMPTY)} />);

    expect(screen.getByText("Write a headline")).toBeInTheDocument();
    expect(screen.getByText("Add a short bio")).toBeInTheDocument();
  });

  // A blank profile has 8 gaps; dumping all of them would swamp the card.
  it("shows at most four next steps", () => {
    render(<CompletenessMeter result={profileCompleteness(EMPTY)} />);

    expect(profileCompleteness(EMPTY).missing.length).toBeGreaterThan(4);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("hides the next steps when asked", () => {
    render(
      <CompletenessMeter result={profileCompleteness(EMPTY)} showMissing={false} />,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(bar()).toBeInTheDocument();
  });

  it("shows the edit call to action while the profile is incomplete", () => {
    render(<CompletenessMeter result={profileCompleteness(EMPTY)} />);

    expect(
      screen.getByRole("link", { name: "Complete your profile" }),
    ).toHaveAttribute("href", "/dashboard/profile/edit");
  });

  // Nagging a finished profile is the regression to guard against.
  it("drops the call to action and the empty list at 100%", () => {
    render(<CompletenessMeter result={profileCompleteness(FULL)} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("merges a caller className without dropping its own layout", () => {
    const { container } = render(
      <CompletenessMeter result={profileCompleteness(FULL)} className="mt-8" />,
    );

    expect(container.firstElementChild).toHaveClass("mt-8", "flex");
  });
});
