import type { Metadata } from "next";

import { listServiceRows } from "@/lib/store";
import { ServicesTable } from "../../_components/services-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
};

export default async function AdminServicesPage() {
  // Dual-path read: SQLite rows when the database exists, the Firestore
  // mirror otherwise — either way the table sees the same row shape.
  const rows = await listServiceRows();

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
