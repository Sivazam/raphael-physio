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
import { firebaseConfigured } from "@/lib/firebase-config";
import { fbAuth } from "@/lib/firebase";

/** Only allow internal admin destinations (open-redirect guard). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/admin") && !raw.startsWith("//")) return raw;
  return "/admin";
}

/** Human messages for Firebase client error codes. */
function firebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts — this account is temporarily locked. Try again shortly.";
    case "auth/network-request-failed":
      return "Could not reach Google — check the connection, or use offline sign-in below.";
    case "auth/operation-not-allowed":
      return "This sign-in method is disabled in the Firebase console.";
    case "auth/unauthorized-domain":
      return "This preview domain is not authorised in Firebase (Authentication → Settings → Authorized domains). Use offline sign-in below for now.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "The Google pop-up was blocked by the browser — allow pop-ups and try again.";
    default:
      return "Sign-in failed — please try again.";
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [offlineMode, setOfflineMode] = useState(!firebaseConfigured);
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

  /** Trade a Firebase ID token for the clinic's admin session cookie. */
  async function exchangeFirebaseToken(idToken: string) {
    const data = await apiFetch<{ user: { name: string | null } }>(
      "/api/admin/auth/firebase",
      "POST",
      { idToken }
    );
    toast.success(
      data.user?.name
        ? `Welcome back, ${data.user.name.split(" ")[0]}.`
        : "Signed in."
    );
    router.replace(target);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (offlineMode) {
        // Offline path — the clinic's own scrypt-backed login (no Google).
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
        return;
      }

      // Firebase email/password → ID token → clinic session.
      const { signInWithEmailAndPassword } = await import(
        "firebase/auth"
      );
      const cred = await signInWithEmailAndPassword(
        fbAuth(),
        email,
        password
      );
      const idToken = await cred.user.getIdToken();
      await exchangeFirebaseToken(idToken);
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (code.startsWith("auth/")) {
        const message = firebaseErrorMessage(code);
        setError(message);
        toast.error(message);
      } else {
        const fields =
          (err as Error & { fieldErrors?: Record<string, string> })
            .fieldErrors;
        if (fields) setFieldErrors(fields);
        const message =
          err instanceof Error
            ? err.message
            : "Sign in failed — please try again.";
        setError(message);
        toast.error(message);
      }
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (googleBusy) return;
    setError(null);
    setGoogleBusy(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import(
        "firebase/auth"
      );
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(fbAuth(), provider);
      const idToken = await cred.user.getIdToken();
      await exchangeFirebaseToken(idToken);
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      const message = code.startsWith("auth/")
        ? firebaseErrorMessage(code)
        : "Google sign-in failed — please try again.";
      setError(message);
      toast.error(message);
      setGoogleBusy(false);
    }
  }

  const busy = submitting || googleBusy;

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

          <Button type="submit" disabled={busy} className="mt-1">
            <KeyRound className="size-4" aria-hidden="true" />
            {submitting ? "Signing in…" : "Sign in"}
          </Button>

          {firebaseConfigured ? (
            <>
              <div className="flex items-center gap-3 py-1" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleGoogle}
              >
                {googleBusy ? (
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                ) : (
                  <GoogleIcon />
                )}
                {googleBusy ? "Opening Google…" : "Continue with Google"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOfflineMode((v) => !v);
                  setError(null);
                }}
                className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {offlineMode
                  ? "Use Firebase sign-in instead"
                  : "Use offline sign-in instead"}
              </button>
            </>
          ) : null}

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

/** The standard multi-colour Google "G" mark (trademark-safe simple form). */
function GoogleIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
