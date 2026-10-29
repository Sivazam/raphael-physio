import { db } from "@/lib/db";
import { getOperatingHours, getSettings } from "@/lib/settings";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { RegisterSw } from "@/components/pwa/register-sw";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { Grain } from "@/components/site/grain";
import { CurtainIntro } from "@/components/site/curtain";
import { DAY_NAMES_SHORT, formatTime12h } from "@/lib/content";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, hours, services] = await Promise.all([
    getSettings(),
    getOperatingHours(),
    db.service
      .findMany({
        where: { status: "published" },
        select: { slug: true, name: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
      })
      .catch(() => []),
  ]);

  // Compact hours summary for the header strip (12-hour clock):
  // "Mon–Sat 9:00 AM – 1:00 PM · 2:00 – 6:00 PM"
  const openDays = hours.filter((h) => h.isOpen);
  const hoursSummary =
    openDays.length > 0
      ? `${DAY_NAMES_SHORT[openDays[0].dayOfWeek]}–${
          DAY_NAMES_SHORT[openDays[openDays.length - 1].dayOfWeek]
        } ${openDays[0].sessions
          .map((s) => `${formatTime12h(s.start)} – ${formatTime12h(s.end)}`)
          .join(" · ")}`
      : "Call for hours";

  return (
    <div className="flex min-h-screen flex-col">
      <CurtainIntro />
      <SmoothScroll />
      <Grain />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <SiteHeader
        phoneDisplay={settings.phonePrimaryDisplay}
        phoneHref={`tel:${settings.phonePrimary}`}
        hoursSummary={hoursSummary}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} hours={hours} services={services} />
      <RegisterSw />
    </div>
  );
}
