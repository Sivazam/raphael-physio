import type { Metadata } from "next";

import { getAdminSession } from "@/lib/auth";
import { listAppUsers } from "@/lib/app-users";
import { UsersTable } from "../../_components/users-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff access",
};

export default async function AdminUsersPage() {
  const session = await getAdminSession();

  // The access registry is owner territory — admins only.
  if (session?.role !== "admin") {
    return (
      <div className="grid gap-6">
        <div>
          <p className="kicker">Access</p>
          <h1 className="font-display text-3xl tracking-tight">
            Staff access
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This page needs an administrator account.
          </p>
        </div>
      </div>
    );
  }

  // Reads never throw: an unreachable Firestore shows the honest empty state.
  const users = await listAppUsers().catch(() => []);

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Access</p>
        <h1 className="font-display text-3xl tracking-tight">
          Staff access
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff create their own account on the sign-in page (email/password
          or Google). New accounts land here with access off — flip the
          switch to approve them; they reach the dashboard on their next
          page load. Clinic admin accounts (the built-in identity, the env
          allowlist, Firestore <code>admins</code> docs) always have access
          and never appear here.
        </p>
      </div>

      <UsersTable rows={users} />
    </div>
  );
}
