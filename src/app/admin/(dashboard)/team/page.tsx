import type { Metadata } from "next";

import { listTherapistRows } from "@/lib/store";
import { TeamTable } from "../../_components/team-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Team",
};

export default async function AdminTeamPage() {
  // Dual-path read: SQLite when the database exists, the Firestore mirror
  // otherwise — languages/expertise arrive parsed either way.
  const rows = await listTherapistRows();

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">People</p>
        <h1 className="font-display text-3xl tracking-tight">
          Therapist team
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish a profile only with that physiotherapist&apos;s approval —
          the public team page shows published profiles only. Honest content
          policy: no invented names or credentials.
        </p>
      </div>

      <TeamTable rows={rows} />
    </div>
  );
}
