import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt — served at `/robots.txt`.
 *
 * The whole public site may be crawled; the administrative interface and
 * the API endpoints are off-limits. The sitemap URL is derived from the
 * canonical site origin (NEXT_PUBLIC_SITE_URL in production — see
 * docs/deployment.md).
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
