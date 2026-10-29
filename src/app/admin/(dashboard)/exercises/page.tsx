import type { Metadata } from "next";

import {
  listExerciseCategoryOptions,
  listExerciseRows,
} from "@/lib/store";
import { ExercisesTable } from "../../_components/exercises-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exercises",
};

export default async function AdminExercisesPage() {
  // Dual-path reads: SQLite when the database exists, the Firestore mirror
  // otherwise — same row shapes either way.
  const [rows, categoryOptions] = await Promise.all([
    listExerciseRows(),
    listExerciseCategoryOptions(),
  ]);

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
