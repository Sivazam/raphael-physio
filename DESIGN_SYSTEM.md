# DESIGN_SYSTEM.md — Raphael Physiotherapy & Rehabilitation Centre

An original visual system for a warm, editorial healthcare website. The intent:
a bespoke, calm, confident identity that feels **commissioned from a thoughtful
studio**, never like a generic AI landing page.

Research references inspected and patterns adopted are documented in
`docs/design-research.md`.

---

## 1. Brand personality

- **Calm, confident, human.** Clinical credibility without institutional coldness.
- **Editorial.** Strong typography, generous whitespace, deliberate composition.
- **Honest.** No inflated statistics, no stock-photo claims of being the clinic,
  no aggressive sales language, no cure promises.
- **Indian healthcare context.** Local, approachable, phone-first (many patients
  will call rather than submit forms).

## 2. Color system

Implemented as shadcn-style CSS variables (oklch) in `src/app/globals.css`.
Light mode is the primary identity; dark mode is a warm espresso variant
(system-triggered only — no toggle clutter).

**Source of truth: the clinic's real logo artwork** (client-supplied PNG —
golden crescent, red runner, black lettering). The palette is derived from it:
gold `#D8C03C`, red `#FC2424`, warm black. Green is retired from the brand.

| Role | Token | Light | Dark | Usage |
|---|---|---|---|---|
| Base background | `--background` | warm ivory `oklch(0.972 0.011 90)` | warm espresso-black | page canvas |
| Foreground | `--foreground` | warm charcoal `oklch(0.268 0.014 70)` | warm ivory | body text |
| Brand / primary | `--primary` | deep espresso `oklch(0.255 0.019 62)` ≈ #2B2420 | light gold | CTAs, facts strip, footer |
| Secondary surface | `--secondary` | warm sand `oklch(0.921 0.022 85)` | deep sand | quiet surfaces |
| Accent surface | `--accent` | warm sand tint | sand tint | hover fills |
| Gold accent | `--clay` / `--clay-deep` | brand gold `oklch(0.76 0.125 90)` / deep gold `oklch(0.58 0.115 85)` ≈ #D8C03C / #A8861F | lighter gold | kickers, small highlights ONLY |
| Brand red | `--brand-red` | `oklch(0.552 0.19 27)` ≈ #C93A31 | brighter red | tiny garnish: icons, links, one-word emphasis. Never large fills |
| Muted foreground | `--muted-foreground` | warm grey | lighter grey | secondary text |
| Border | `--border` | warm hairline | subtle warm line | dividers, cards |
| Deep brand | `--brand-deep` | darkest espresso | near-black | gradients, footer depth |

**Rules**

- Gold is a garnish: kickers, small labels, single-word emphasis, italic
  epigraphs. Never large fills or body text.
- Brand red is used sparingly — small icons, active states, one-word
  emphasis. It is never a page background or button fill (buttons stay
  espresso; that keeps red from reading as “medical emergency”).
- No blue, no indigo, no neon gradients, no glassmorphism.
- Contrast: primary-on-ivory, ivory-on-primary, charcoal-on-ivory all pass
  WCAG AA. Muted foreground is reserved for ≥14px secondary text.

## 3. Typography

- **Display — Fraunces** (variable, optical sizing on): headlines, section titles,
  the wordmark. Used via the `font-display` class or the automatic `h1–h3` rule
  in globals.css. Tracking tight (`tracking-tight`) at large sizes.
- **Text/UI — Inter**: body, navigation, forms, buttons, admin.
- Scale (approx): hero `text-4xl sm:text-5xl lg:text-6xl`; section titles
  `text-3xl sm:text-4xl`; card titles `text-lg–xl`; body `text-base`;
  secondary `text-sm`; kickers `text-xs uppercase tracking-[0.18em]`.
- The **kicker** (small clay uppercase label above titles) is the signature
  editorial device. Use one per section.

## 4. Layout & spacing

- Container: `.site-container` = `max-w-6xl` (72rem) with responsive padding.
- Section rhythm: `py-16 sm:py-24`, alternating background tones
  (background → secondary/paper tint → background) for editorial cadence.
- Sticky header (h-17 main bar + slim trust strip on lg).
- Footer is deep espresso, full-bleed, `mt-auto` in a `min-h-screen flex flex-col`
  wrapper — always pinned to the viewport bottom on short pages.
- Grid discipline: never repeat identical card rows more than twice in a page;
  alternate image-led / text-led / typographic compositions (see Home).

## 5. Components

- **shadcn/ui (New York)** is the base; tokens above restyle it automatically.
  Prefer `Button`, `Card`, `Sheet`, `Dialog`, `Accordion`, `Input`, `Label`,
  `Select`, `Checkbox`, `Badge`, `Tabs`, `Table`, `Sonner` toasts.
- Radius: 10px base (`--radius: 0.625rem`) — soft but not pill-shaped
  (pills only for chips/tags).
- Shadows: minimal. Prefer hairline borders (`border-border`) + tone shifts.
- Focus: visible `outline-ring` on all interactive elements (never remove).
- Long lists: `max-h-96` (or similar) + `overflow-y-auto` + `.scroll-warm`.

## 6. Imagery

- Photography: warm documentary tone. Every image uses Next `<Image>` with
  `sizes`, lazy below the fold, and honest alt text beginning with
  "Illustrative photo:" for sourced/generated imagery (see
  `public/asset-attribution.md`).
- Image treatment: slight warm tone is acceptable via overlays; avoid heavy
  filters. Rounded corners `rounded-xl`–`rounded-2xl`, sometimes offset frames
  (a clay or sage border offset behind a photo) for editorial character.
- The **real clinic logo** (`public/images/logo.png`, transparent PNG —
  golden crescent, red runner, arched lettering, motto inside) is used as:
  the emblem beside the header wordmark, on a white chip in the footer,
  and as the source for PWA icons (`scripts/prepare-assets.ts`). The text
  inside the emblem is illegible below ~140px, so it is always paired with
  the typographic lockup when small. The client motto — **“Mission To Make
  Man Moving”** (`SITE.motto`) — appears as the hero epigraph and in the
  footer; it may be quoted on About, always verbatim.

## 7. Motion

- framer-motion only, via `<Reveal>` (fade + 18px rise, 0.6s, once).
- `prefers-reduced-motion` respected globally (CSS override + Reveal fallback).
- No marquees, spinners-as-decoration, parallax, or scroll-jacking.

## 8. Voice & content

- Plain, warm, precise English (Indian English conventions acceptable).
- Say "appointment request", never "your appointment is confirmed".
- Educational exercises are labelled as general guidance, not prescriptions.
- Empty states (no published therapists/stories/reviews yet) are designed,
  honest, and end with a path forward (call / book / link).

## 9. Accessibility contract

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page,
  logical heading order.
- Skip-to-content link on every site page.
- All interactive elements keyboard reachable with visible focus.
- Forms: labels + described errors (never color-only), announcements via
  `aria-live`/toast for async results.
- Touch targets ≥ 44px on mobile.

## 10. Do-not list (anti-patterns)

Gradient hero blobs · identical 3-card grids repeated · glassmorphism · neon ·
fake 3D illustrations · animated word cycles · stats counters without verified
data · lorem ipsum · invented testimonials · watermarked stock · claiming
sourced photos are clinic photos · cure/outcome promises · dashboards on a
public informational site.
