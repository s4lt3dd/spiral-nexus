import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { ChipsInput } from "@/components/ui/chips-input";

// Controlled component: drive it through a host so onChange actually updates
// the rendered chips, the way the listing form uses it.
function Host({
  initial = [],
  max,
  onChange,
}: {
  initial?: string[];
  max?: number;
  onChange?: (v: string[]) => void;
}) {
  const [values, setValues] = useState<string[]>(initial);
  return (
    <ChipsInput
      values={values}
      max={max}
      placeholder="Add a country"
      onChange={(v) => {
        setValues(v);
        onChange?.(v);
      }}
    />
  );
}

const field = () => screen.getByPlaceholderText("Add a country");

describe("ChipsInput", () => {
  it("renders no chip list when empty", () => {
    render(<Host />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the initial values as removable chips", () => {
    render(<Host initial={["United Kingdom", "Japan"]} />);

    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove United Kingdom" }),
    ).toBeInTheDocument();
  });

  it("adds a value on Enter and clears the field", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(field(), "Japan{Enter}");

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(field()).toHaveValue("");
  });

  it("adds a value on comma", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(field(), "Japan,");

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(field()).toHaveValue("");
  });

  it("adds the pending draft on blur so a typed value is not lost", async () => {
    const user = userEvent.setup();
    render(<Host />);

    await user.type(field(), "Japan");
    await user.tab();

    expect(screen.getByText("Japan")).toBeInTheDocument();
  });

  it("trims whitespace and trailing commas", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);

    await user.type(field(), "  Japan,,  {Enter}");

    expect(onChange).toHaveBeenCalledWith(["Japan"]);
  });

  it("ignores an empty or whitespace-only entry", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);

    await user.type(field(), "{Enter}");
    await user.type(field(), "   {Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("dedupes case-insensitively and keeps the first spelling", async () => {
    const user = userEvent.setup();
    render(<Host initial={["Japan"]} />);

    await user.type(field(), "japan{Enter}");

    expect(screen.getAllByText(/japan/i)).toHaveLength(1);
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(field()).toHaveValue("");
  });

  it("removes a chip via its remove button", async () => {
    const user = userEvent.setup();
    render(<Host initial={["United Kingdom", "Japan"]} />);

    await user.click(screen.getByRole("button", { name: "Remove Japan" }));

    expect(screen.queryByText("Japan")).not.toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
  });

  it("removes the last chip on Backspace in an empty field", async () => {
    const user = userEvent.setup();
    render(<Host initial={["United Kingdom", "Japan"]} />);

    await user.click(field());
    await user.keyboard("{Backspace}");

    expect(screen.queryByText("Japan")).not.toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
  });

  it("does not remove a chip on Backspace while editing the draft", async () => {
    const user = userEvent.setup();
    render(<Host initial={["Japan"]} />);

    await user.type(field(), "Xy{Backspace}");

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(field()).toHaveValue("X");
  });

  it("stops accepting values at the max", async () => {
    const user = userEvent.setup();
    render(<Host initial={["A", "B"]} max={2} />);

    await user.type(field(), "C{Enter}");

    expect(screen.queryByText("C")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
