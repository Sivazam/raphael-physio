import type { Metadata } from "next";

import { db } from "@/lib/db";
import { ServicesTable } from "../../_components/services-table";
import type { ServiceRow } from "../../_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
};

export default async function AdminServicesPage() {
  const services = await db.service
    .findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { category: { select: { name: true } } },
    })
    .catch(() => []);

  const rows: ServiceRow[] = services.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    summary: s.summary,
    description: s.description,
    imageUrl: s.imageUrl,
    featured: s.featured,
    status: s.status,
    sortOrder: s.sortOrder,
    categoryName: s.category?.name ?? null,
  }));

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Clinical wings</p>
        <h1 className="font-display text-3xl tracking-tight">Services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft services stay hidden from the public website. The page slug
          can&apos;t be edited — it is part of public URLs and printed links.
        </p>
      </div>

      <ServicesTable rows={rows} />
    </div>
  );
}
