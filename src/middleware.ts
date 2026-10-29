import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge guard for /admin/** and /api/admin/**.
 *
 * This is deliberately a *presence* check only — the HMAC verification in
 * src/lib/auth.ts needs Node crypto, which is not available on the edge
 * runtime. Full verifySession() runs inside every admin page layout and every
 * /api/admin route handler, so a forged or expired cookie gets no further
 * than the server boundary.
 */

const ADMIN_COOKIE = "rph_admin";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // The sign-in page and the auth endpoints are the only public admin routes
  // (login must be reachable without a cookie; logout/me verify themselves).
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(req.cookies.get(ADMIN_COOKIE)?.value);

  if (!hasSessionCookie) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { ok: false, error: "Please sign in to continue." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/admin/login", req.url);
    // Preserve the destination (including filters) for after sign-in.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
