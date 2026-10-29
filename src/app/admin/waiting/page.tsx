import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getAdminSession } from "@/lib/auth";
import { getAppUserRecord } from "@/lib/app-users";
import { WaitingScreen } from "../_components/waiting-screen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Awaiting approval",
  robots: { index: false, follow: false },
};

/**
 * /admin/waiting — the approval screen for app users (role "member").
 *
 * Reached after a successful Firebase sign-in whose `users` document still
 * has appAccess=false. The page re-reads the flag on every load, so the
 * moment the owner flips it to true, a refresh here (or the periodic
 * re-check in the WaitingScreen client component) redirects straight to the
 * dashboard. Clinic admin identities are never parked here.
 */
export default async function AdminWaitingPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "member") redirect("/admin");

  const record = await getAppUserRecord(session.email).catch(() => null);
  if (record?.appAccess) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <WaitingScreen
        email={session.email}
        name={record?.displayName ?? null}
      />
    </main>
  );
}
