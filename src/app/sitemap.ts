import type { MetadataRoute } from "next";
import {
  getPublishedExercises,
  getPublishedServices,
} from "@/lib/catalog";
import { SITE } from "@/lib/site";

/**
 * XML sitemap — served at `/sitemap.xml`.
 *
 * Static public pages plus every *published* service and exercise slug
 * (drafts and archived content are deliberately excluded). Reads go
 * through the content catalog, so the sitemap is complete both on the
 * local database and on database-less serverless deploys (Vercel), which
 * serve the baked-in published snapshot.
 *
 * Re-generated at most hourly so newly published admin content appears in
 * the sitemap without a redeploy.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/+$/, "");
  const now = new Date();

  const [services, exercises] = await Promise.all([
    getPublishedServices(),
    getPublishedExercises(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/team`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/stories`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/exercises`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const serviceEntries: MetadataRoute.Sitemap = services.map(
    (service): MetadataRoute.Sitemap[number] => ({
      url: `${base}/services/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
  );

  const exerciseEntries: MetadataRoute.Sitemap = exercises.map(
    (exercise): MetadataRoute.Sitemap[number] => ({
      url: `${base}/exercises/${exercise.slug}`,
      lastModified: exercise.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [...staticEntries, ...serviceEntries, ...exerciseEntries];
}
