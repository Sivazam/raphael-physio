import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    /* Admins can paste any https image URL (or a Firebase Storage link
       returned by /api/admin/upload) into CMS media fields — allow all
       https hosts rather than maintaining an allowlist. */
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
