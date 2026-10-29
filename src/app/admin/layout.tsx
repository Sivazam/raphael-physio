import type { Metadata } from "next";

/**
 * Bare wrapper for every /admin route (login + dashboard). Adds no chrome —
 * the dashboard chrome lives in (dashboard)/layout.tsx so the sign-in page
 * stays clean. All admin content is private: never indexed.
 */
export const metadata: Metadata = {
  title: "Clinic admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
