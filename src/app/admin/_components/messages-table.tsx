"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Eye, MailCheck, MailOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { MessageRow } from "../_lib/types";
import { formatClinicDateTime } from "../_lib/format";

async function setMessageStatus(
  row: MessageRow,
  status: "new" | "read" | "archived"
): Promise<string> {
  await apiFetch(`/api/admin/messages/${row.id}`, "PATCH", { status });
  const labels: Record<string, string> = {
    new: "marked unread",
    read: "marked read",
    archived: "archived",
  };
  return `Message ${labels[status]}.`;
}

export function MessagesTable({ rows }: { rows: MessageRow[] }) {
  const router = useRouter();
  const [viewing, setViewing] = useState<MessageRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function apply(row: MessageRow, status: "new" | "read" | "archived") {
    if (busyId) return;
    setBusyId(row.id);
    try {
      toast.success(await setMessageStatus(row, status));
      if (viewing?.id === row.id && status !== "archived") {
        setViewing({ ...viewing, status });
      } else if (viewing?.id === row.id) {
        setViewing(null);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No messages here yet. Enquiries from the contact form will appear in
        this list.
      </p>
    );
  }

  return (
    <>
      <div className="max-h-[70vh] overflow-auto rounded-xl border scroll-warm">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead>From</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="min-w-[240px]">Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="whitespace-nowrap">Received</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.status === "new" ? (
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-primary"
                      />
                      {row.name}
                    </span>
                  ) : (
                    row.name
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.phone ? (
                    <a
                      href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {row.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                  {row.email ? (
                    <>
                      <br />
                      <a
                        href={`mailto:${row.email}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {row.email}
                      </a>
                    </>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {row.message}
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
                      onClick={() => setViewing(row)}
                      aria-label={`View message from ${row.name}`}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      View
                    </Button>
                    {row.status === "new" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => apply(row, "read")}
                        aria-label={`Mark message from ${row.name} as read`}
                      >
                        <MailCheck className="size-4" aria-hidden="true" />
                      </Button>
                    ) : row.status === "read" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => apply(row, "new")}
                        aria-label={`Mark message from ${row.name} as unread`}
                      >
                        <MailOpen className="size-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View dialog */}
      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Message from {viewing.name}
                </DialogTitle>
                <DialogDescription>
                  Received {formatClinicDateTime(viewing.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  {viewing.phone ? (
                    <a
                      href={`tel:${viewing.phone.replace(/[^\d+]/g, "")}`}
                      className="underline underline-offset-2"
                    >
                      {viewing.phone}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  {viewing.email ? (
                    <a
                      href={`mailto:${viewing.email}`}
                      className="underline underline-offset-2"
                    >
                      {viewing.email}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </dd>
              </dl>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
                {viewing.message}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === viewing.id}
                  onClick={() =>
                    apply(viewing, viewing.status === "archived" ? "read" : "archived")
                  }
                >
                  {viewing.status === "archived" ? (
                    <>
                      <ArchiveRestore className="size-4" aria-hidden="true" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" aria-hidden="true" />
                      Archive
                    </>
                  )}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === viewing.id}
                    onClick={() => apply(viewing, "new")}
                  >
                    <MailOpen className="size-4" aria-hidden="true" />
                    Mark unread
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === viewing.id}
                    onClick={() => apply(viewing, "read")}
                  >
                    <MailCheck className="size-4" aria-hidden="true" />
                    Mark read
                  </Button>
                </div>
              </div>

              {viewing.status === "archived" ? (
                <p className="text-xs text-muted-foreground">
                  Archived messages are kept for reference and stay out of the
                  default list.
                </p>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
