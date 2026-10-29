# Asset sources & licensing notes

Internal companion to the public manifest at
[`public/asset-attribution.md`](../public/asset-attribution.md) — the two
files list the same facts; this one adds workflow detail. Every image the
website serves is accounted for below.

The project's rule: **nothing on the site may imply it depicts the actual
clinic unless it really does.** Every non-clinic image therefore carries alt
text beginning "Illustrative photo:" and no photo is ever captioned as the
centre's own space, staff, or patients.

---

## 1. Brand artwork — client-supplied (clinic-owned)

| File | What it is |
|---|---|
| `public/images/logo.png` | The clinic's real logo (golden crescent, red runner, arched lettering, motto "Mission To Make Man Moving"). Client-supplied PNG, background knocked out to transparency by the orchestrator. **© the clinic** — used with their permission as the site's brand mark. |
| `public/images/logo@2x.png` | 2× rendition of the same artwork for high-density screens. Same ownership. |
| `public/icons/icon-192.png` · `icon-512.png` · `maskable-192.png` · `maskable-512.png` · `apple-touch-icon.png` | PWA/app icons **generated from `logo.png`** (logo composited on a white square at 94% / maskable at 72% inside the safe zone / Apple touch at 82%) by `scripts/prepare-assets.ts`. Derived brand assets — same ownership as the logo. |
| `public/icons/favicon-16.png` · `favicon-32.png` · `favicon-48.png` (tab favicon) | **The clinic's real logo artwork itself** (no redraw), transparent background, lanczos-downscaled by `scripts/prepare-assets.ts`. Same ownership as the logo. The old hand-redrawn `icon.svg` approximations were removed — the favicon is now pixel-for-pixel the client-supplied mark. |

To regenerate the raster icons after replacing the logo master:
`bun scripts/prepare-assets.ts` (skips re-compressing `logo*.png`).

## 2. Photography — AI-generated illustrative imagery (9)

All nine photographs (`public/images/photo-*.jpg`) were **generated for this
project** with the z-ai image-generation service so the imagery reflects the
people and setting of Rajamahendravaram — Indian therapists and patients,
local clinic interiors. None depicts the actual clinic, real staff, or real
patients; each carries "Illustrative photo:" alt text and is never captioned
as the centre's own space. They remain pre-launch placeholders: the clinic's
own photographs will replace them when supplied (see
`docs/content-needed.md` §1).

| File | Subject (people/setting) | Where it is used |
|---|---|---|
| `photo-therapist-band.jpg` | Indian physiotherapist guiding elderly Indian patient, resistance band (864×1152 portrait) | Hero, services |
| `photo-team-therapy.jpg` | Two Indian physiotherapists reviewing a recovery chart (864×1152 portrait) | Team section |
| `photo-treatment-room.jpg` | Indian treatment room, empty (1024×1024) | Homepage, about, services |
| `photo-rehab-gym.jpg` | Indian rehabilitation gym, empty (1152×864) | About, services |
| `photo-gait-training.jpg` | Indian therapist + elderly Indian patient, parallel bars (1152×864) | Homepage, services |
| `photo-band-gym.jpg` | Two Indian men, resistance band row (1728×864 wide) | About, services |
| `photo-care-strength.jpg` | Indian therapist + elderly Indian woman in saree, dumbbell (1024×1024) | About, stories |
| `photo-manual-therapy.jpg` | Indian therapist's hands, neck therapy (1344×768) | Homepage, services |
| `photo-inpatient-room.jpg` | Indian in-patient room, bed + walker (1152×864) | Homepage, services |

- **How generated:** one-off generation script (2026-10-29) with
  warm-editorial style prompts; every image passed a two-round vision-model
  QA gate for (a) South Indian appearance of the people, (b) AI-rendering
  artefacts (garbled text, warped equipment, fused fingers). Two images
  were regenerated to fix artefacts; gait-training was regenerated twice to
  remove an East-Asian-looking therapist.
- **Licence status:** clean — generated for this project, no third-party
  photographer or stock licence involved. (This also resolves the licence
  ambiguity of the earlier sourced set.)
- **Honesty guardrails:** alt text + attribution manifest state the images
  are illustrative; captions never claim them as the clinic's rooms/staff.

### History

The first photography set (six web-sourced stock-style images + two earlier
AI-generated interiors, in place 2026-10-27 → 2026-10-29) was fully replaced:
a vision-model audit found the stock people shots depicted African, East
Asian, and Caucasian subjects — jarring for a Rajamahendravaram clinic — and
the two generated interiors carried artefacts. The old files remain in git
history. Also: `photo-shoulder-therapy.png` (rejected during the original
selection for showing a third-party brand) still sits unused in the repo
root and can be deleted.

## 3. Fonts & icons (code)

- **Fraunces** and **Inter** are self-hosted by `next/font/google` at build
  time (no third-party runtime requests; licences: SIL Open Font License 1.1).
- **Lucide** icons (`lucide-react`, ISC licence) are used for small UI
  glyphs only — never as medical illustrations.

## 4. Nothing else

No other third-party media is bundled or hot-linked. Google Maps is linked
out (no embedded API media), and no tracking/analytics pixels are present.

---

### Change log

- 2026-10-27 — initial audit (agent G, task 4-g): classified all 8 photos
  via pixel-signature matching against the raw downloads plus three
  vision-model passes (the two AI-generated images were confirmed by
  artefact inspection).
- 2026-10-29 — full replacement: all web-sourced photos (non-Indian
  subjects) and the two artefacted AI interiors replaced with 9
  Indian-context generated images, VLM-QA'd in two rounds; team section
  got a dedicated image (previously reused the hero photo).
