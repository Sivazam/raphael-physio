import type { Metadata } from "next";

import { db } from "@/lib/db";
import { StoriesTable } from "../../_components/stories-table";
import type { StoryRow, OptionItem } from "../../_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patient stories",
};

export default async function AdminStoriesPage() {
  const [stories, therapists] = await Promise.all([
    db.patientStory
      .findMany({
        orderBy: { createdAt: "desc" },
        include: { therapist: { select: { id: true, name: true } } },
      })
      .catch(() => []),
    db.therapist
      .findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
      .catch(() => []),
  ]);

  const rows: StoryRow[] = stories.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    conditionContext: s.conditionContext,
    journey: s.journey,
    beforeImageUrl: s.beforeImageUrl,
    afterImageUrl: s.afterImageUrl,
    therapistId: s.therapistId,
    therapistName: s.therapist?.name ?? null,
    consentStatus: s.consentStatus,
    consentReference: s.consentReference,
    status: s.status,
  }));

  const therapistOptions: OptionItem[] = therapists.map((t) => ({
    id: t.id,
    label: t.name,
  }));

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
