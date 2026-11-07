import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product photos live in Supabase Storage. Vercel resizes them to the size shown and caches the result,
  // so Supabase sends each original only now and then instead of to every visitor.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
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
