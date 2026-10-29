import type { Metadata } from "next";

import { listStoryRows, listTherapistOptions } from "@/lib/store";
import { StoriesTable } from "../../_components/stories-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patient stories",
};

export default async function AdminStoriesPage() {
  // Dual-path reads: SQLite when the database exists, the Firestore mirror
  // otherwise — same row shapes either way.
  const [rows, therapistOptions] = await Promise.all([
    listStoryRows(),
    listTherapistOptions(),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Recovery journeys</p>
        <h1 className="font-display text-3xl tracking-tight">
          Patient stories
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A story can only be published when consent is{" "}
          <strong>approved</strong> and a consent reference is on file. The API
          enforces this rule, not just the form.
        </p>
      </div>

      <StoriesTable rows={rows} therapistOptions={therapistOptions} />
    </div>
  );
}
