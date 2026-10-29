import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { AdminNav } from "../_components/admin-nav";

/**
 * Auth gate for every dashboard page. Full HMAC verification (not just the
 * middleware's cookie-presence check): an invalid or expired token lands on
 * the sign-in page.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

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
