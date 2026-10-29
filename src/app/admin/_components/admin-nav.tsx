"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  BookHeart,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fbAuth } from "@/lib/firebase";
import { apiFetch } from "../_lib/client";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/services", label: "Services", icon: Stethoscope },
  { href: "/admin/exercises", label: "Exercises", icon: Activity },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/stories", label: "Stories", icon: BookHeart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

/** Owner-only — the staff access registry (approvals). */
const ADMIN_LINK = {
  href: "/admin/users",
  label: "Access",
  icon: UserCog,
} as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav({
  email,
  name,
  role,
}: {
  email: string;
  name: string | null;
  role: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/admin/auth/logout", "POST");
      // Also close the Firebase client session so the next person on this
      // browser starts from a clean account (best-effort, never blocks).
      try {
        const { signOut: fbSignOut } = await import("firebase/auth");
        await fbSignOut(fbAuth());
      } catch {
        /* Firebase may not have a session here — nothing to close. */
      }
      toast.success("Signed out.");
      router.replace("/admin/login");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sign out failed — please try again."
      );
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-primary"
            />
            <span className="font-display text-lg font-semibold tracking-tight">
              Raphael Physio
            </span>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline">
              {name ?? email}
              {role === "admin" ? "" : ` (${role})`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              disabled={signingOut}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="-mx-1 overflow-x-auto">
          <ul className="flex min-w-max items-center gap-1 px-1">
            {(role === "admin" ? [...LINKS, ADMIN_LINK] : LINKS).map(
              ({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              }
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
