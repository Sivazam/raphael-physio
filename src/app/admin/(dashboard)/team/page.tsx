import type { Metadata } from "next";

import { db } from "@/lib/db";
import { TeamTable } from "../../_components/team-table";
import type { TherapistRow } from "../../_lib/types";
import { parseJsonArray } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Team",
};

export default async function AdminTeamPage() {
  const therapists = await db.therapist
    .findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
    .catch(() => []);

  const rows: TherapistRow[] = therapists.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    title: t.title,
    qualifications: t.qualifications,
    experienceYears: t.experienceYears,
    bio: t.bio,
    photoUrl: t.photoUrl,
    languages: parseJsonArray<string>(t.languages),
    expertise: parseJsonArray<string>(t.expertise),
    status: t.status,
    sortOrder: t.sortOrder,
  }));

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
