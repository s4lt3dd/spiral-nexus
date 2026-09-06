import type { NextConfig } from "next";

// Vercel sets VERCEL=1 at build time. Its builder produces its own output and
// fails on `output: "standalone"`, so the self-hosted settings apply only off
// Vercel (Docker image, local `next build`). Transitional until the Vercel
// project is retired (docs/TARGET-ARCHITECTURE.md §8).
const selfHosted = !process.env.VERCEL;

const nextConfig: NextConfig = {
  // Self-hosted target: the Dockerfile copies .next/standalone, which bundles
  // only the server files the app needs.
  ...(selfHosted ? { output: "standalone" as const } : {}),
  // No sharp on the box. Listing images / avatars are size-limited user
  // uploads served from object storage behind Cloudflare's edge cache.
  images: { unoptimized: selfHosted },
  poweredByHeader: false,
};

export default nextConfig;
