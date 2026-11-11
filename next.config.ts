import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Product photos live in Cloudflare R2 (img.pyaarse.net). They're resized to the size shown, and
  // worker.ts caches each resized copy at Cloudflare's edge. The Supabase pattern covers links not yet moved.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.pyaarse.net", pathname: "/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    // Uploaded files get a fresh random name, so a cached copy never goes stale.
    minimumCacheTTL: 31 * 24 * 3600,
    deviceSizes: [384, 640, 828, 1080, 1600],
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // The dev-only MCP endpoint has no auth; keep it off.
    mcpServer: false,
  },
};

export default nextConfig;

// Lets `next dev` use the Cloudflare bindings in wrangler.jsonc (a local R2 bucket for photo uploads).
initOpenNextCloudflareForDev();
