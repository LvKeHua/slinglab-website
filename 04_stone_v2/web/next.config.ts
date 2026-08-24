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
  // In dev mode, proxy API requests to the Stone backend.
  // The backend may be local (default :8766) or on the US VPS
  // (STONE_API_TARGET env, e.g. http://vps-us:8766).
  ...(isDev
    ? {
        async rewrites() {
          const target = process.env.STONE_API_TARGET ?? "http://127.0.0.1:8766";
          return [
            {
              source: "/api/:path*",
              destination: `${target}/api/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
