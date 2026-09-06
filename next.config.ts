import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted target (docs/TARGET-ARCHITECTURE.md): the Dockerfile copies
  // .next/standalone, which bundles only the server files the app needs.
  output: "standalone",
  // No sharp on the box. Listing images / avatars are size-limited user
  // uploads served from object storage behind Cloudflare's edge cache.
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
