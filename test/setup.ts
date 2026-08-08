import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Component tests assert on the public Supabase URL prefix that the listing
// image validator pins uploads to. Set it before any module reads it.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";

afterEach(() => {
  cleanup();
});

// jsdom has no layout engine, so scrollIntoView / matchMedia are missing.
// Components that call them (message thread, motion-reduce checks) would throw.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}
