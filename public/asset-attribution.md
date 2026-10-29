# Asset attribution

Public manifest of every image served by this website (Raphael
Physiotherapy & Rehabilitation Centre, Rajamahendravaram). Internal detail
and workflow notes live in `docs/asset-sources.md`; the two documents are
kept consistent.

**Site policy:** no image on this website is presented as depicting the
actual clinic unless it really does. Every illustrative image carries alt
text beginning "Illustrative photo:" and is never captioned as the centre's
own rooms, staff, or patients.

---

## Brand artwork — supplied by the clinic (© the clinic)

- `public/images/logo.png`, `public/images/logo@2x.png` — the clinic's own
  logo artwork (golden crescent, red runner, motto "Mission To Make Man
  Moving"), used with their permission. Background removed for the site
  lockups.
- `public/icons/icon-192.png`, `icon-512.png`, `maskable-192.png`,
  `maskable-512.png`, `apple-touch-icon.png` — PWA/app icons generated from
  that logo.
- `public/icons/favicon-16.png`, `favicon-32.png`, `favicon-48.png` — the
  tab favicon, rendered directly from the same real logo artwork
  (transparent PNG downscales). Same ownership as the logo; no
  third-party claim.

## Photography — illustrative placeholders (not photographs of this clinic)

**Sourced images (6)** — retrieved through an image-search service
(public web imagery); each was reviewed with a vision model for subject
appropriateness at selection time. The service provides no per-image
licence record, so these are **pre-launch placeholders**: before the site
goes public they will be replaced with the clinic's own photographs or
properly licensed stock.

- `public/images/photo-treatment-room.jpg` — treatment room with plinth
- `public/images/photo-rehab-gym.jpg` — rehabilitation gym
- `public/images/photo-gait-training.jpg` — gait training between bars
- `public/images/photo-band-gym.jpg` — resistance-band exercise
- `public/images/photo-care-strength.jpg` — supported strength / care work
- `public/images/photo-therapist-band.jpg` — therapist guiding a band exercise

**AI-generated images (2)** — created for this project with an
image-generation service. They depict plausible but **not real** interiors
and people and are never captioned as the clinic's rooms or staff.

- `public/images/photo-inpatient-room.jpg` — in-patient room (generated)
- `public/images/photo-manual-therapy.jpg` — hands-on manual therapy
  (generated)

## Fonts & interface icons

- Fraunces & Inter — self-hosted via next/font (SIL Open Font License 1.1).
- Lucide icon set (ISC licence) — small interface glyphs only.

---

*Last reviewed: 27 October 2026. Corrections or licence queries:
raphaelphysiotherapyclinic@gmail.com.*
