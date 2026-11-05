import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // The dev-only MCP endpoint has no auth; keep it off.
    mcpServer: false,
  },
};

export default nextConfig;
