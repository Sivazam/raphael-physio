"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { apiFetch } from "../_lib/client";
import type { AppointmentRow } from "../_lib/types";
import {
  formatClinicDateTime,
  formatTime12h,
  formatYmd,
} from "../_lib/format";

const STATUS_OPTIONS = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function AppointmentsTable({ rows }: { rows: AppointmentRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("requested");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openManage(row: AppointmentRow) {
    setSelected(row);
    setStatusDraft(row.status);
    setNoteDraft(row.adminNote ?? "");
  }

  async function saveChanges() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/appointments/${selected.id}`, "PATCH", {
        status: statusDraft,
        adminNote: noteDraft.trim() === "" ? null : noteDraft.trim(),
      });
      toast.success("Appointment request updated.");
      setSelected(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAppointment(row: AppointmentRow) {
    if (deletingId) return;
    setDeletingId(row.id);
    try {
      await apiFetch(`/api/admin/appointments/${row.id}`, "DELETE");
      toast.success("Appointment request deleted.");
      if (selected?.id === row.id) setSelected(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No appointment requests here yet. New requests from the booking page
        will appear in this list.
      </p>
    );
  }

  return (
    <>
      <div className="max-h-[70vh] overflow-auto rounded-xl border scroll-warm">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead>Patient</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Requested for</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="whitespace-nowrap">Received</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.patientName}
                  <br />
                  <a
                    href={telHref(row.phone)}
                    className="text-sm font-normal text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {row.phone}
                  </a>
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                  {row.serviceName ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatYmd(row.appointmentDate)}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {formatTime12h(row.appointmentSlot)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatClinicDateTime(row.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openManage(row)}
                    >
                      Manage
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete request from ${row.patientName}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete this appointment request?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the request from{" "}
                            <strong>{row.patientName}</strong> for{" "}
                            {formatYmd(row.appointmentDate)} at{" "}
                            {formatTime12h(row.appointmentSlot)}. Prefer
                            “Cancelled” if you want to keep the record.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAppointment(row)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Manage dialog */}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {selected.patientName}
                </DialogTitle>
                <DialogDescription>
                  Requested {formatClinicDateTime(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">When</dt>
                <dd>
                  {formatYmd(selected.appointmentDate)} at{" "}
                  {formatTime12h(selected.appointmentSlot)}
                </dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  <a
                    href={telHref(selected.phone)}
                    className="underline underline-offset-2"
                  >
                    {selected.phone}
                  </a>
                </dd>
                {selected.email ? (
                  <>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${selected.email}`}
                        className="underline underline-offset-2"
                      >
                        {selected.email}
                      </a>
                    </dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Service</dt>
                <dd>{selected.serviceName ?? "Not specified"}</dd>
                <dt className="text-muted-foreground">SMS consent</dt>
                <dd>{selected.consentGiven ? "Given" : "Not given"}</dd>
                {selected.notes ? (
                  <>
                    <dt className="text-muted-foreground">Patient note</dt>
                    <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                  </>
                ) : null}
              </dl>

              <div className="grid gap-2">
                <Label htmlFor="appt-status">Status</Label>
                <Select value={statusDraft} onValueChange={setStatusDraft}>
                  <SelectTrigger id="appt-status" className="w-full">
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

              <div className="grid gap-2">
                <Label htmlFor="appt-note">Internal note (never shown to patients)</Label>
                <Textarea
                  id="appt-note"
                  rows={3}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="e.g. Confirmed by phone at 10:30 am; patient asked for a morning slot."
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete request
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete this appointment request?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the request from{" "}
                        <strong>{selected.patientName}</strong>. Prefer
                        “Cancelled” if you want to keep the record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep it</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAppointment(selected)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={saveChanges} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
