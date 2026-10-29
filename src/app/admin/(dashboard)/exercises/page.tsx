import type { Metadata } from "next";

import { db } from "@/lib/db";
import { ExercisesTable } from "../../_components/exercises-table";
import type { ExerciseRow, OptionItem } from "../../_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exercises",
};

export default async function AdminExercisesPage() {
  const [exercises, categories] = await Promise.all([
    db.exercise
      .findMany({
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        include: { category: { select: { name: true } } },
      })
      .catch(() => []),
    db.exerciseCategory
      .findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      })
      .catch(() => []),
  ]);

  const rows: ExerciseRow[] = exercises.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    purpose: e.purpose,
    instructions: e.instructions,
    imageUrl: e.imageUrl,
    videoUrl: e.videoUrl,
    youtubeUrl: e.youtubeUrl,
    categoryId: e.categoryId,
    featured: e.featured,
    status: e.status,
    sortOrder: e.sortOrder,
    categoryName: e.category?.name ?? null,
  }));

  const categoryOptions: OptionItem[] = categories.map((c) => ({
    id: c.id,
    label: c.name,
  }));

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Education library</p>
        <h1 className="font-display text-3xl tracking-tight">Exercises</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          General educational content — never framed as a prescription. Draft
          exercises stay hidden from the public library. Share URLs use the
          slug, so it can&apos;t be edited.
        </p>
      </div>

      <ExercisesTable rows={rows} categoryOptions={categoryOptions} />
    </div>
  );
}
