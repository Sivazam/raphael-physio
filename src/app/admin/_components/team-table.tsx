"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { TherapistRow } from "../_lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

interface FormState {
  name: string;
  title: string;
  qualifications: string;
  experienceYears: string;
  bio: string;
  photoUrl: string;
  languages: string;
  expertise: string;
  sortOrder: string;
  status: string;
}

function toFormState(row: TherapistRow): FormState {
  return {
    name: row.name,
    title: row.title ?? "",
    qualifications: row.qualifications ?? "",
    experienceYears: row.experienceYears === null ? "" : String(row.experienceYears),
    bio: row.bio ?? "",
    photoUrl: row.photoUrl ?? "",
    languages: row.languages.join(", "),
    expertise: row.expertise.join(", "),
    sortOrder: String(row.sortOrder),
    status: row.status,
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

export function TeamTable({ rows }: { rows: TherapistRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TherapistRow | null>(null);
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
      await apiFetch(`/api/admin/team/${editing.id}`, "PATCH", {
        name: form.name,
        title: form.title.trim() === "" ? null : form.title.trim(),
        qualifications:
          form.qualifications.trim() === "" ? null : form.qualifications.trim(),
        experienceYears:
          form.experienceYears.trim() === ""
            ? null
            : Number(form.experienceYears),
        bio: form.bio.trim() === "" ? null : form.bio.trim(),
        photoUrl: form.photoUrl.trim() || null,
        languages: splitList(form.languages),
        expertise: splitList(form.expertise),
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status,
      });
      toast.success(`“${form.name}” saved.`);
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
        No therapist profiles yet. Profiles are created by the database seed —
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
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-center">Experience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Sort</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[220px]">
                  <span className="font-medium">{row.name}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    /team/{row.slug}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {row.title ?? "—"}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {row.experienceYears === null
                    ? "—"
                    : `${row.experienceYears} yrs`}
                </TableCell>
                <TableCell>
                  <StatusSelect
                    endpoint="/api/admin/team/"
                    id={row.id}
                    value={row.status}
                    options={STATUS_OPTIONS}
                    ariaLabel={`Status for ${row.name}`}
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
                    aria-label={`Edit ${row.name}`}
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {editing && form ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Edit therapist
                </DialogTitle>
                <DialogDescription>
                  {editing.name} · /team/{editing.slug}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="th-name">Name</Label>
                  <Input
                    id="th-name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                  {fieldErrors.name ? (
                    <p className="text-sm text-destructive">{fieldErrors.name}</p>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="th-title">Title</Label>
                    <Input
                      id="th-title"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="e.g. Chief Physiotherapist"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="th-exp">Experience (years)</Label>
                    <Input
                      id="th-exp"
                      type="number"
                      min={0}
                      max={80}
                      value={form.experienceYears}
                      onChange={(e) => update("experienceYears", e.target.value)}
                      placeholder="Leave blank if not verified"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="th-quals">Qualifications</Label>
                  <Input
                    id="th-quals"
                    value={form.qualifications}
                    onChange={(e) => update("qualifications", e.target.value)}
                    placeholder="e.g. BPT, MPT (Orthopaedics)"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="th-bio">Bio</Label>
                  <Textarea
                    id="th-bio"
                    rows={4}
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                  />
                </div>

                <MediaField
                  id="th-photo"
                  label="Photo"
                  kind="image"
                  folder="team"
                  value={form.photoUrl}
                  onChange={(v) => update("photoUrl", v)}
                  hint="Portrait shown on the team page — paste a link or upload."
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="th-languages">Languages (comma-separated)</Label>
                    <Input
                      id="th-languages"
                      value={form.languages}
                      onChange={(e) => update("languages", e.target.value)}
                      placeholder="English, Telugu"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="th-expertise">Expertise (comma-separated)</Label>
                    <Input
                      id="th-expertise"
                      value={form.expertise}
                      onChange={(e) => update("expertise", e.target.value)}
                      placeholder="Orthopaedics, Sports rehab"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="th-sort">Sort order</Label>
                    <Input
                      id="th-sort"
                      type="number"
                      min={0}
                      max={999}
                      value={form.sortOrder}
                      onChange={(e) => update("sortOrder", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="th-status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => update("status", v)}
                    >
                      <SelectTrigger id="th-status" className="w-full">
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
