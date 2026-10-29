import type { Metadata } from "next";
import Link from "next/link";

import { listAppointmentRows } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AppointmentsTable } from "../../_components/appointments-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appointment requests",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function parseFilter(value: string | string[] | undefined): Filter {
  const raw = Array.isArray(value) ? value[0] : value;
  return FILTERS.some((f) => f.value === raw) ? (raw as Filter) : "all";
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);

  // Dual-path read: SQLite when the database exists, Firestore otherwise.
  const rows = await listAppointmentRows(
    filter === "all" ? undefined : { status: filter }
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Bookings</p>
        <h1 className="font-display text-3xl tracking-tight">
          Appointment requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Requests are <em>not</em> confirmed appointments until you set the
          status. Dates and times are clinic-local (Asia/Kolkata).
        </p>
      </div>

      <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max items-center gap-1 px-1">
          {FILTERS.map((f) => {
            const href =
              f.value === "all"
                ? "/admin/appointments"
                : `/admin/appointments?status=${f.value}`;
            const active = filter === f.value;
            return (
              <li key={f.value}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                    active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {f.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AppointmentsTable rows={rows} />
    </div>
  );
}
