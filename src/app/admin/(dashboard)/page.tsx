import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BookHeart,
  CalendarClock,
  FileEdit,
  MessageSquare,
  Phone,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "../_components/status-badge";
import { formatTime12h, formatYmd, todayYmdClinic } from "../_lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
};

const QUICK_LINKS = [
  {
    href: "/admin/appointments",
    label: "Appointment requests",
    description: "Confirm, reschedule or complete patient requests.",
    icon: CalendarClock,
  },
  {
    href: "/admin/messages",
    label: "Contact messages",
    description: "Read and reply to website enquiries.",
    icon: MessageSquare,
  },
  {
    href: "/admin/services",
    label: "Services",
    description: "Publish, edit or archive clinical services.",
    icon: Stethoscope,
  },
  {
    href: "/admin/exercises",
    label: "Exercises",
    description: "Manage the educational exercise library.",
    icon: Activity,
  },
  {
    href: "/admin/team",
    label: "Team",
    description: "Therapist profiles — publish only with approval.",
    icon: Users,
  },
  {
    href: "/admin/stories",
    label: "Patient stories",
    description: "Consent-gated recovery stories.",
    icon: BookHeart,
  },
] as const;

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  const today = todayYmdClinic();

  const [
    newAppointments,
    unreadMessages,
    draftServices,
    draftExercises,
    draftTherapists,
    draftStories,
    todayRequests,
  ] = await Promise.all([
    db.appointmentRequest
      .count({ where: { status: "requested" } })
      .catch(() => 0),
    db.contactMessage.count({ where: { status: "new" } }).catch(() => 0),
    db.service.count({ where: { status: "draft" } }).catch(() => 0),
    db.exercise.count({ where: { status: "draft" } }).catch(() => 0),
    db.therapist.count({ where: { status: "draft" } }).catch(() => 0),
    db.patientStory.count({ where: { status: "draft" } }).catch(() => 0),
    db.appointmentRequest
      .findMany({
        where: { appointmentDate: today, status: { not: "cancelled" } },
        orderBy: { appointmentSlot: "asc" },
        take: 10,
      })
      .catch(() => []),
  ]);

  const draftTotal =
    draftServices + draftExercises + draftTherapists + draftStories;

  return (
    <div className="grid gap-8">
      <div>
        <p className="kicker">Clinic admin</p>
        <h1 className="font-display text-3xl tracking-tight">
          Good day — here&apos;s what needs attention
        </h1>
        <p className="mt-1 text-muted-foreground">
          Signed in as {session?.email}. Dates and times shown in clinic local
          time (Rajamahendravaram).
        </p>
      </div>

      {/* Counts overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/appointments?status=requested"
          className="group rounded-xl focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarClock className="size-4" aria-hidden="true" />
                New appointment requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-4xl font-semibold">
                {newAppointments}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Awaiting clinic confirmation
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/admin/messages?status=new"
          className="group rounded-xl focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="size-4" aria-hidden="true" />
                Unread messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-4xl font-semibold">
                {unreadMessages}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                From the contact form
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link
          href="/admin/services"
          className="group rounded-xl focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileEdit className="size-4" aria-hidden="true" />
                Draft content items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-4xl font-semibold">
                {draftTotal}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {draftServices} services · {draftExercises} exercises ·{" "}
                {draftTherapists} therapists · {draftStories} stories
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today at the clinic */}
      <section aria-labelledby="today-heading">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 id="today-heading" className="font-display text-xl">
            Today at the clinic
          </h2>
          <span className="text-sm text-muted-foreground">
            {formatYmd(today)}
          </span>
        </div>
        {todayRequests.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No appointment requests for today.
          </p>
        ) : (
          <ul className="max-h-72 divide-y overflow-y-auto rounded-xl border scroll-warm">
            {todayRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {formatTime12h(r.appointmentSlot)}
                </span>
                <span className="min-w-0 flex-1 truncate">{r.patientName}</span>
                {r.serviceName ? (
                  <span className="hidden text-muted-foreground sm:inline">
                    {r.serviceName}
                  </span>
                ) : null}
                <a
                  href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  Call
                </a>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="mb-3 font-display text-xl">
          Quick links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 rounded-md bg-secondary p-2 text-secondary-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Need to change phones, hours or booking rules?{" "}
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
          >
            <Settings className="size-3.5" aria-hidden="true" />
            Clinic settings
          </Link>
        </p>
      </section>
    </div>
  );
}
