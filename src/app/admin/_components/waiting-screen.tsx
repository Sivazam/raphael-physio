"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Hourglass, LogOut, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SITE } from "@/lib/site";
import { fbAuth } from "@/lib/firebase";
import { apiFetch } from "../_lib/client";

/**
 * The approval waiting screen for self-service staff accounts.
 *
 * - re-checks the approval flag every 30 seconds (router.refresh() re-runs
 *   the server component, which redirects to /admin the moment the owner
 *   sets appAccess=true — no re-login needed);
 * - "Check now" does the same on demand;
 * - signing out clears the clinic session cookie.
 */
export function WaitingScreen({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  /* Periodic re-check — the owner's approval lands here without the user
     needing to know about hard refreshes. */
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  async function checkNow() {
    if (checking) return;
    setChecking(true);
    try {
      router.refresh();
      // The refresh is async; give the server component a beat to redirect
      // before clearing the button state (no error path — nothing to fail).
      await new Promise((r) => setTimeout(r, 1200));
    } finally {
      setChecking(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiFetch("/api/admin/auth/logout", "POST");
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
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Image
          src="/images/logo.png"
          alt={`${SITE.name} emblem`}
          width={64}
          height={64}
          className="mx-auto mb-2 size-16 object-contain"
          priority
        />
        <span
          aria-hidden="true"
          className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-gold-soft bg-gold-soft/40 text-clay-deep"
        >
          <Hourglass className="size-5 animate-pulse" />
        </span>
        <CardTitle className="font-display text-xl">
          {name ? `Almost there, ${name.split(" ")[0]}` : "Almost there"}
        </CardTitle>
        <CardDescription>
          Your account is registered and waiting for the clinic&apos;s
          approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{email}</span>. The
          clinic owner approves new staff accounts before they can open the
          dashboard. This page re-checks automatically every 30 seconds —
          once approved you&apos;ll go straight through, or press{" "}
          <em>Check now</em> at any moment.
        </p>
        <div className="grid gap-2">
          <Button type="button" onClick={checkNow} disabled={checking}>
            <RefreshCw
              className={checking ? "size-4 animate-spin" : "size-4"}
              aria-hidden="true"
            />
            {checking ? "Checking…" : "Check now"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Back to the public website
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
