import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values so conditional classes are safe", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  // The reason this helper exists: a caller's `className` prop must be able to
  // override a component's own Tailwind class, not fight it.
  it("lets a later Tailwind class win over an earlier conflicting one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-slate-500", "text-foreground")).toBe("text-foreground");
  });

  it("keeps non-conflicting classes from both sides", () => {
    expect(cn("rounded-md px-2", "px-4")).toBe("rounded-md px-4");
  });

  it("accepts arrays and objects", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("returns an empty string with no input", () => {
    expect(cn()).toBe("");
  });
});
