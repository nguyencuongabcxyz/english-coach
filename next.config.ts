import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully per-user (session cookie + database), so we use the
  // classic dynamic rendering model instead of Cache Components.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
