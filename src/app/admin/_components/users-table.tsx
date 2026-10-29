"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Globe, KeyRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppUserRecord } from "@/lib/app-users";
import { apiFetch } from "../_lib/client";

function formatDay(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function providerBadge(provider: string | null) {
  if (provider === "google.com") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Globe className="size-3" aria-hidden="true" />
        Google
      </Badge>
    );
  }
  if (provider === "password") {
    return (
      <Badge variant="secondary" className="gap-1">
        <KeyRound className="size-3" aria-hidden="true" />
        Email
      </Badge>
    );
  }
  return <Badge variant="outline">—</Badge>;
}

/**
 * The access registry table — one row per registered app user, one switch
 * per row. Flipping the switch PATCHes the Firestore `users` document; the
 * affected user passes (or loses) the dashboard gate on their next page
 * load.
 */
export function UsersTable({ rows }: { rows: AppUserRecord[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function toggleAccess(user: AppUserRecord, next: boolean) {
    if (pending) return;
    setPending(user.id);
    try {
      const data = await apiFetch<{ message?: string }>(
        "/api/admin/users",
        "PATCH",
        { email: user.email, appAccess: next }
      );
      toast.success(data.message ?? "Access updated.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update access."
      );
    } finally {
      setPending(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No staff accounts have registered yet. When someone creates an
        account on the sign-in page (email/password or Google), they will
        appear here awaiting approval.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff member</TableHead>
            <TableHead>Sign-in</TableHead>
            <TableHead className="hidden sm:table-cell">Registered</TableHead>
            <TableHead className="hidden md:table-cell">Last sign-in</TableHead>
            <TableHead className="text-right">Dashboard access</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="max-w-[240px]">
                <p className="truncate font-medium">
                  {user.displayName ?? user.email.split("@")[0]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </TableCell>
              <TableCell>{providerBadge(user.provider)}</TableCell>
              <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                {formatDay(user.createdAt)}
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {formatDay(user.lastLoginAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {user.appAccess ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      Waiting
                    </span>
                  )}
                  <Switch
                    checked={user.appAccess}
                    disabled={pending === user.id}
                    onCheckedChange={(next) => toggleAccess(user, next)}
                    aria-label={
                      user.appAccess
                        ? `Revoke dashboard access for ${user.email}`
                        : `Approve dashboard access for ${user.email}`
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pending ? (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Updating…
        </p>
      ) : null}
    </div>
  );
}
