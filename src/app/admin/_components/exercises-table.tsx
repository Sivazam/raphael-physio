"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Star, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusSelect } from "./status-select";
import { MediaField } from "./media-field";
import { apiFetch } from "../_lib/client";
import { mirrorEntity } from "@/lib/firebase-mirror";
import type { ExerciseRow, OptionItem } from "../_lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

interface FormState {
  title: string;
  summary: string;
  purpose: string;
  instructions: string;
  imageUrl: string;
  videoUrl: string;
  youtubeUrl: string;
  categoryId: string;
  sortOrder: string;
  featured: boolean;
  status: string;
}

function toFormState(row: ExerciseRow): FormState {
  return {
    title: row.title,
    summary: row.summary,
    purpose: row.purpose ?? "",
    instructions: row.instructions,
    imageUrl: row.imageUrl ?? "",
    videoUrl: row.videoUrl ?? "",
    youtubeUrl: row.youtubeUrl ?? "",
    categoryId: row.categoryId ?? "none",
    sortOrder: String(row.sortOrder),
    featured: row.featured,
    status: row.status,
  };
}

export function ExercisesTable({
  rows,
  categoryOptions,
}: {
  rows: ExerciseRow[];
  categoryOptions: OptionItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm(toFormState(editing));
      setFieldErrors({});
    }
  }, [editing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!editing || !form || saving) return;
    setSaving(true);
    setFieldErrors({});
    try {
      await apiFetch(`/api/admin/exercises/${editing.id}`, "PATCH", {
        title: form.title,
        summary: form.summary,
        purpose: form.purpose.trim() === "" ? null : form.purpose.trim(),
        instructions: form.instructions,
        imageUrl: form.imageUrl.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        categoryId: form.categoryId === "none" ? null : form.categoryId,
        sortOrder: Number(form.sortOrder) || 0,
        featured: form.featured,
        status: form.status,
      });
      void mirrorEntity("exercises", editing.id, {
        title: form.title,
        slug: editing.slug,
        summary: form.summary,
        imageUrl: form.imageUrl.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        status: form.status,
        featured: form.featured,
      });
      toast.success(`“${form.title}” saved.`);
      setEditing(null);
      router.refresh();
    } catch (err) {
      const fields =
        (err as Error & { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fields) setFieldErrors(fields);
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No exercises found. Exercises are created by the database seed —
        contact the site maintainer to add new ones.
      </p>
    );
  }

  return (
    <>
      <div className="max-h-[70vh] overflow-auto rounded-xl border scroll-warm">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead>Exercise</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Featured</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Sort</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[260px]">
                  <span className="font-medium">{row.title}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    /exercises/{row.slug}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.categoryName ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  {row.featured ? (
                    <Star
                      className="mx-auto size-4 text-clay-deep"
                      aria-label="Featured"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusSelect
                    endpoint="/api/admin/exercises/"
                    id={row.id}
                    value={row.status}
                    options={STATUS_OPTIONS}
                    ariaLabel={`Status for ${row.title}`}
                  />
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {row.sortOrder}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(row)}
                    aria-label={`Edit ${row.title}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {editing && form ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Edit exercise
                </DialogTitle>
                <DialogDescription>
                  {editing.title} · /exercises/{editing.slug}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ex-title">Title</Label>
                  <Input
                    id="ex-title"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.title)}
                  />
                  {fieldErrors.title ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.title}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ex-summary">Summary</Label>
                  <Textarea
                    id="ex-summary"
                    rows={2}
                    value={form.summary}
                    onChange={(e) => update("summary", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.summary)}
                  />
                  {fieldErrors.summary ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.summary}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ex-purpose">Purpose</Label>
                  <Textarea
                    id="ex-purpose"
                    rows={2}
                    value={form.purpose}
                    onChange={(e) => update("purpose", e.target.value)}
                    placeholder="Why this exercise is taught (optional)"
                  />
                  {fieldErrors.purpose ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.purpose}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ex-instructions">
                    Step-by-step instructions (one step per line)
                  </Label>
                  <Textarea
                    id="ex-instructions"
                    rows={6}
                    value={form.instructions}
                    onChange={(e) => update("instructions", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.instructions)}
                  />
                  {fieldErrors.instructions ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.instructions}
                    </p>
                  ) : null}
                </div>

                <MediaField
                  id="ex-image"
                  label="Image"
                  kind="image"
                  folder="exercises"
                  value={form.imageUrl}
                  onChange={(v) => update("imageUrl", v)}
                  hint="Shown at the top of the exercise's page. Paste a link or upload a file."
                />

                <div className="grid gap-2">
                  <Label htmlFor="ex-youtube">YouTube link</Label>
                  <div className="relative">
                    <Youtube
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="ex-youtube"
                      value={form.youtubeUrl}
                      onChange={(e) => update("youtubeUrl", e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className="pl-9"
                      aria-invalid={Boolean(fieldErrors.youtubeUrl)}
                    />
                  </div>
                  {fieldErrors.youtubeUrl ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.youtubeUrl}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    A YouTube watch/shorts/youtu.be link — embedded on the
                    exercise page.
                  </p>
                </div>

                <MediaField
                  id="ex-video"
                  label="Video upload"
                  kind="video"
                  folder="exercises"
                  value={form.videoUrl}
                  onChange={(v) => update("videoUrl", v)}
                  hint="MP4/WebM uploaded via Firebase Storage (or local disk until configured) — played on the exercise page. YouTube link above takes care of embeds."
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ex-category">Category</Label>
                    <Select
                      value={form.categoryId}
                      onValueChange={(v) => update("categoryId", v)}
                    >
                      <SelectTrigger id="ex-category" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ex-sort">Sort order</Label>
                    <Input
                      id="ex-sort"
                      type="number"
                      min={0}
                      max={999}
                      value={form.sortOrder}
                      onChange={(e) => update("sortOrder", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 items-end gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ex-status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => update("status", v)}
                    >
                      <SelectTrigger id="ex-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.featured}
                      onCheckedChange={(v) => update("featured", v === true)}
                    />
                    Featured in the library
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
