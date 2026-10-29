import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { getAppUserRecord } from "@/lib/app-users";
import { SITE } from "@/lib/site";
import { AdminNav } from "../_components/admin-nav";

/**
 * Auth gate for every dashboard page. Full HMAC verification (not just the
 * middleware's cookie-presence check): an invalid or expired token lands on
 * the sign-in page.
 *
 * App users (role "member") additionally pass the approval gate: their
 * Firestore `users` document is re-read on EVERY request, so an account the
 * owner approves (`appAccess: true`) reaches the dashboard on the next page
 * load — and one that is revoked loses it again just as fast. Clinic admin
 * tiers never consult the gate. The read failing closed (Firestore
 * unreachable → waiting screen) is deliberate: an unreadable gate must not
 * become an open one.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role === "member") {
    const record = await getAppUserRecord(session.email).catch(() => null);
    if (!record?.appAccess) redirect("/admin/waiting");
  }

  const user = await db.adminUser
    .findUnique({
      where: { id: session.sub },
      select: { email: true, name: true, role: true },
    })
    .catch(() => null);

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav
        email={user?.email ?? session.email}
        name={user?.name ?? null}
        role={user?.role ?? session.role}
      />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          {SITE.name} · private staff area — sign-in required.{" "}
          <a
            href="/"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Back to the public website
          </a>
        </div>
      </footer>
    </div>
  );
}
