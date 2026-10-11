import type { NextConfig } from "next";

const isGhPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGhPages ? "export" : undefined,
  basePath: isGhPages ? "/sphinx" : undefined,
  assetPrefix: isGhPages ? "/sphinx/" : undefined,
  trailingSlash: isGhPages ? true : undefined,
  images: isGhPages ? { unoptimized: true } : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  ...(!isGhPages && {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            // A child's device should never cache stale puzzles or leak referrer data.
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;