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

## 2. Photography — placeholders, two kinds

Eight photographs currently serve as **illustrative placeholders**
(`public/images/photo-*.jpg`, max width 1600, ~80% quality progressive JPEG
via `scripts/prepare-assets.ts`). None depicts the actual clinic.

### 2a. Sourced stock-style images (6) — ⚠ licence placeholder

| File | Subject | Where it is used |
|---|---|---|
| `photo-treatment-room.jpg` | Treatment room with plinth | Homepage, services |
| `photo-rehab-gym.jpg` | Rehabilitation gym | Homepage, services, about |
| `photo-gait-training.jpg` | Gait training between parallel bars | Services |
| `photo-band-gym.jpg` | Resistance-band exercise in a gym | About, exercises |
| `photo-care-strength.jpg` | Supported strength / care work | Homepage, about |
| `photo-therapist-band.jpg` | Therapist guiding a band exercise | Services |

- **How sourced:** retrieved through the ZAI in-house image-search service
  (public web imagery re-hosted by the service).
- **Verification done:** each was checked with a vision model at selection
  time for subject appropriateness (correct physiotherapy context, no
  watermarks, no visible third-party branding, no gore or identifiable
  branding that would misrepresent the clinic).
- **Licence status: NOT resolved.** The search service does not carry
  per-image licence records, so these six are treated as **pre-launch
  placeholders only**. Before public launch they must be replaced by
  (a) the clinic's own photographs — preferred, see
  `docs/content-needed.md` §1 — or (b) properly licensed stock with receipts
  kept in this file's table above.

### 2b. AI-generated images (2)

| File | Subject | Where it is used |
|---|---|---|
| `photo-inpatient-room.jpg` | In-patient room with bed and walker | In-patient & day care service page |
| `photo-manual-therapy.jpg` | Hands-on manual therapy | Manual therapy service page |

- **How generated:** created for this project with the z-ai image-generation
  service (no third-party photographer involved).
- **What they depict:** plausible but **not real** interiors/people; they
  must never be captioned as the clinic's rooms or staff.
- A vision-model audit (2026-10-27) confirmed both carry typical
  generation artefacts (structurally impossible walker joinery; fused
  fingers / airbrushed skin) — consistent with their declared status. No
  claim is made that they are photographs.

### 2c. Rejected during selection

- `photo-shoulder-therapy.png` (sitting in the **repository root**, not in
  `public/images`) — sourced alongside the 2a set but **rejected** because
  the therapist's uniform shows a third-party brand ("Hi Physio"). It is
  unused by the site and should be deleted from the repo. The un-optimised
  originals of the 2a photos also sit in the repo root as leftover working
  files and can be removed once `public/images` is considered final.

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
