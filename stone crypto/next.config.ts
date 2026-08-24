import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "export",
  // basePath handles both asset URLs and <Link> href routing
  // In production, everything is served under /stone
  // In dev, no prefix so localhost:3000 works normally
  basePath: isDev ? undefined : "/stone",
  images: {
    unoptimized: true,
  },
  // In dev mode, proxy API requests to the local self-hosted backend
  ...(isDev
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://127.0.0.1:8766/api/:path*",
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
