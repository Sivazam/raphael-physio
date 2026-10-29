"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Star } from "lucide-react";

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
import type { ServiceRow } from "../_lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

interface FormState {
  name: string;
  tagline: string;
  summary: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
  featured: boolean;
  status: string;
}

function toFormState(row: ServiceRow): FormState {
  return {
    name: row.name,
    tagline: row.tagline ?? "",
    summary: row.summary,
    description: row.description,
    imageUrl: row.imageUrl ?? "",
    sortOrder: String(row.sortOrder),
    featured: row.featured,
    status: row.status,
  };
}

export function ServicesTable({ rows }: { rows: ServiceRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ServiceRow | null>(null);
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
      await apiFetch(`/api/admin/services/${editing.id}`, "PATCH", {
        name: form.name,
        tagline: form.tagline.trim() === "" ? null : form.tagline.trim(),
        summary: form.summary,
        description: form.description,
        imageUrl: form.imageUrl.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        featured: form.featured,
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
        No services found. Services are created by the database seed — contact
        the site maintainer to add new service pages.
      </p>
    );
  }

  return (
    <>
      <div className="max-h-[70vh] overflow-auto rounded-xl border scroll-warm">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead>Service</TableHead>
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
                  <span className="font-medium">{row.name}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    /services/{row.slug}
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
                    endpoint="/api/admin/services/"
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
                  Edit service
                </DialogTitle>
                <DialogDescription>
                  {editing.name} · /services/{editing.slug}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="svc-name">Name</Label>
                  <Input
                    id="svc-name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                  {fieldErrors.name ? (
                    <p className="text-sm text-destructive">{fieldErrors.name}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="svc-tagline">Tagline</Label>
                  <Input
                    id="svc-tagline"
                    value={form.tagline}
                    onChange={(e) => update("tagline", e.target.value)}
                    placeholder="Short one-line description"
                    aria-invalid={Boolean(fieldErrors.tagline)}
                  />
                  {fieldErrors.tagline ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.tagline}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="svc-summary">Summary</Label>
                  <Textarea
                    id="svc-summary"
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
                  <Label htmlFor="svc-description">Description (full page copy)</Label>
                  <Textarea
                    id="svc-description"
                    rows={8}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.description)}
                  />
                  {fieldErrors.description ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.description}
                    </p>
                  ) : null}
                </div>

                <MediaField
                  id="svc-image"
                  label="Image"
                  kind="image"
                  folder="services"
                  value={form.imageUrl}
                  onChange={(v) => update("imageUrl", v)}
                  hint="Shown on the service page and cards — paste a link or upload."
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="svc-sort">Sort order</Label>
                    <Input
                      id="svc-sort"
                      type="number"
                      min={0}
                      max={999}
                      value={form.sortOrder}
                      onChange={(e) => update("sortOrder", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="svc-status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => update("status", v)}
                    >
                      <SelectTrigger id="svc-status" className="w-full">
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

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.featured}
                    onCheckedChange={(v) => update("featured", v === true)}
                  />
                  Featured (shown prominently on the services page)
                </label>
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
