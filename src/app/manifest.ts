import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Web app manifest (PWA installability).
 *
 * Served by Next.js at `/manifest.webmanifest` (the framework adds the
 * matching `<link rel="manifest">` to the document head automatically).
 * Icons are pre-rendered from the clinic's real logo artwork by
 * `scripts/prepare-assets.ts` — see `public/asset-attribution.md`.
 *
 * Colours follow the design system: warm ivory page background and the deep
 * espresso brand tone used for browser chrome on installed apps.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F5EF",
    theme_color: "#2B2420",
    lang: "en",
    dir: "ltr",
    categories: ["health", "medical"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
