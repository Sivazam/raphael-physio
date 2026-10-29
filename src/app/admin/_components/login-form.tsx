"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE } from "@/lib/site";
import { apiFetch } from "../_lib/client";

/** Only allow internal admin destinations (open-redirect guard). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/admin") && !raw.startsWith("//")) return raw;
  return "/admin";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const redirected = useRef(false);

  // Already signed in? Head straight to the dashboard (full verification —
  // the /me route checks the signature, unlike the edge middleware).
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    fetch("/api/admin/auth/me")
      .then((res) => {
        if (res.ok) {
          router.replace(target);
        }
      })
      .catch(() => {
        /* stay on the sign-in page */
      });
  }, [router, target]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: { name: string | null } }>(
        "/api/admin/auth/login",
        "POST",
        { email, password }
      );
      toast.success(
        data.user?.name
          ? `Welcome back, ${data.user.name.split(" ")[0]}.`
          : "Signed in."
      );
      router.replace(target);
      router.refresh();
    } catch (err) {
      const fields =
        (err as Error & { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fields) setFieldErrors(fields);
      const message =
        err instanceof Error ? err.message : "Sign in failed — please try again.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Image
          src="/images/logo.png"
          alt={`${SITE.name} emblem`}
          width={64}
          height={64}
          className="mx-auto mb-2 size-16 object-contain"
          priority
        />
        <CardTitle className="font-display text-xl">
          Clinic staff sign-in
        </CardTitle>
        <CardDescription>
          {SITE.shortName} — Rajamahendravaram. This area is for clinic staff
          only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              placeholder="you@example.com"
            />
            {fieldErrors.email ? (
              <p id="login-email-error" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
            />
            {fieldErrors.password ? (
              <p id="login-password-error" className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={submitting} className="mt-1">
            <KeyRound className="size-4" aria-hidden="true" />
            {submitting ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Back to the public website
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
