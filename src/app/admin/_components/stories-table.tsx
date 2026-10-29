"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, ShieldAlert } from "lucide-react";

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
import { StatusBadge } from "./status-badge";
import { StatusSelect } from "./status-select";
import { MediaField } from "./media-field";
import { apiFetch } from "../_lib/client";
import type { OptionItem, StoryRow } from "../_lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const CONSENT_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
] as const;

interface FormState {
  title: string;
  conditionContext: string;
  journey: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  therapistId: string;
  consentStatus: string;
  consentReference: string;
  status: string;
}

function toFormState(row: StoryRow): FormState {
  return {
    title: row.title,
    conditionContext: row.conditionContext ?? "",
    journey: row.journey ?? "",
    beforeImageUrl: row.beforeImageUrl ?? "",
    afterImageUrl: row.afterImageUrl ?? "",
    therapistId: row.therapistId ?? "none",
    consentStatus: row.consentStatus,
    consentReference: row.consentReference ?? "",
    status: row.status,
  };
}

/** Mirrors the server-side consent rule for an honest publish button state. */
function publishBlocked(form: FormState): boolean {
  return (
    form.status === "published" &&
    (form.consentStatus !== "approved" || form.consentReference.trim() === "")
  );
}

export function StoriesTable({
  rows,
  therapistOptions,
}: {
  rows: StoryRow[];
  therapistOptions: OptionItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<StoryRow | null>(null);
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
      await apiFetch(`/api/admin/stories/${editing.id}`, "PATCH", {
        title: form.title,
        conditionContext:
          form.conditionContext.trim() === "" ? null : form.conditionContext.trim(),
        journey: form.journey.trim() === "" ? null : form.journey.trim(),
        beforeImageUrl: form.beforeImageUrl.trim() || null,
        afterImageUrl: form.afterImageUrl.trim() || null,
        therapistId: form.therapistId === "none" ? null : form.therapistId,
        consentStatus: form.consentStatus,
        consentReference:
          form.consentReference.trim() === "" ? null : form.consentReference.trim(),
        status: form.status,
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
        No patient stories yet. Stories are created by the database seed —
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
              <TableHead>Story</TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[280px]">
                  <span className="font-medium">{row.title}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    /stories/{row.slug}
                  </span>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                  {row.therapistName ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.consentStatus} />
                  {row.consentReference ? null : (
                    <span className="ml-2 text-xs text-muted-foreground">
                      no reference on file
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusSelect
                    endpoint="/api/admin/stories/"
                    id={row.id}
                    value={row.status}
                    options={STATUS_OPTIONS}
                    ariaLabel={`Status for ${row.title}`}
                  />
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {editing && form ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Edit patient story
                </DialogTitle>
                <DialogDescription>
                  {editing.title} · /stories/{editing.slug}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="st-title">Title</Label>
                  <Input
                    id="st-title"
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
                  <Label htmlFor="st-context">Condition context</Label>
                  <Textarea
                    id="st-context"
                    rows={2}
                    value={form.conditionContext}
                    onChange={(e) => update("conditionContext", e.target.value)}
                    placeholder="The condition being recovered from (anonymised)"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="st-journey">Recovery journey</Label>
                  <Textarea
                    id="st-journey"
                    rows={6}
                    value={form.journey}
                    onChange={(e) => update("journey", e.target.value)}
                  />
                </div>

                <MediaField
                  id="st-before"
                  label="Before photo"
                  kind="image"
                  folder="stories"
                  value={form.beforeImageUrl}
                  onChange={(v) => update("beforeImageUrl", v)}
                  hint="Recovery photos shown with this story — upload only with documented patient consent."
                />

                <MediaField
                  id="st-after"
                  label="After photo"
                  kind="image"
                  folder="stories"
                  value={form.afterImageUrl}
                  onChange={(v) => update("afterImageUrl", v)}
                  hint="Recovery photos shown with this story — upload only with documented patient consent."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="st-therapist">Therapist</Label>
                    <Select
                      value={form.therapistId}
                      onValueChange={(v) => update("therapistId", v)}
                    >
                      <SelectTrigger id="st-therapist" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not assigned</SelectItem>
                        {therapistOptions.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="st-consent">Consent status</Label>
                    <Select
                      value={form.consentStatus}
                      onValueChange={(v) => update("consentStatus", v)}
                    >
                      <SelectTrigger id="st-consent" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSENT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="st-ref">Consent reference (where documented consent is filed)</Label>
                  <Input
                    id="st-ref"
                    value={form.consentReference}
                    onChange={(e) => update("consentReference", e.target.value)}
                    placeholder="e.g. Signed consent form, clinic file #123"
                    aria-invalid={Boolean(fieldErrors.consentReference)}
                  />
                  {fieldErrors.consentReference ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.consentReference}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="st-status">Publication status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => update("status", v)}
                  >
                    <SelectTrigger id="st-status" className="w-full">
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

                {publishBlocked(form) ? (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Publishing is blocked until consent is approved and a
                    consent reference is on file — the server rejects it too.
                  </p>
                ) : null}
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
