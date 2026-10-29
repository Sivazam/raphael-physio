import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { MessagesTable } from "../../_components/messages-table";
import type { MessageRow } from "../../_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact messages",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function parseFilter(value: string | string[] | undefined): Filter {
  const raw = Array.isArray(value) ? value[0] : value;
  return FILTERS.some((f) => f.value === raw) ? (raw as Filter) : "all";
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);

  const messages = await db.contactMessage
    .findMany({
      where: filter === "all" ? {} : { status: filter },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    .catch(() => []);

  const rows: MessageRow[] = messages.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    email: m.email,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Enquiries</p>
        <h1 className="font-display text-3xl tracking-tight">
          Contact messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages submitted through the website contact form. Reply by phone
          or email — the site never sends email on your behalf.
        </p>
      </div>

      <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max items-center gap-1 px-1">
          {FILTERS.map((f) => {
            const href =
              f.value === "all"
                ? "/admin/messages"
                : `/admin/messages?status=${f.value}`;
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

      <MessagesTable rows={rows} />
    </div>
  );
}
