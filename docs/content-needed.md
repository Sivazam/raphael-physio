# Content still needed from the clinic

This is the honest launch checklist: everything the website needs from
**Raphael Physiotherapy & Rehabilitation Centre** before it can go public
without compromising the project's content policy — *never publish
unverified facts, testimonials, statistics, or credentials*.

Everything currently live that depends on these items is either a
clearly-labelled placeholder (illustrative photography, general service copy
pending approval) or an honest empty state.

**Legend:** ☐ needed · status notes describe what exists today.

---

## 1. Real facility photography (replaces illustrative placeholders)

☐ **Photographs of the actual centre**, taken by or for the clinic:

- Reception / waiting area
- Treatment rooms (at least one with a plinth in normal use)
- Rehabilitation gym & equipment (parallel bars, treadmill, bikes, pulleys…)
- In-patient room(s) (bed, surroundings — reassuring, not clinical-cold)
- Exterior / signage on Jampet Road (helps patients recognise the entrance)
- Gait-training or hands-on treatment in progress — **only if the patients
  and staff in frame give written photo consent**

The eight photos currently on the site are **placeholders** (six sourced
stock-style images, two AI-generated — see `public/asset-attribution.md`).
Every one is alt-prefixed "Illustrative photo:" and none claims to depict
the actual clinic. They must be replaced with clinic-owned photographs, or
properly licensed stock, before public launch.

Deliverables: original high-resolution files (JPG/PNG, un-compressed if
possible). They will be optimised by `scripts/prepare-assets.ts`.

## 2. Therapist profiles (with each physiotherapist's approval)

☐ For every physiotherapist to be listed on /team:

- Full name and clinical title
- Qualifications **exactly as they should appear publicly** (degrees,
  specialisation) — ideally with council registration number for
  verification
- Years of experience (only if the clinic wants it shown)
- A short, factual bio (2–4 sentences) — we can draft from notes
- Photograph (portrait; consent of the person shown)
- Languages spoken
- Areas of expertise (mapped to the service pages)

Status: /team currently shows an honest empty state — profiles are seeded as
**drafts only** and publish only with each individual's approval.

## 3. Patient recovery stories (with written consent)

☐ For each story to be published on /stories:

- The patient's own account (or an interview we may write up and have them
  approve)
- Written, signed consent to publish — the admin UI records a
  **consentStatus** and a reference for where the signed consent is filed
- Optional before/after photographs — separate photo consent required
- The physiotherapist involved, for attribution

Status: /stories currently points visitors to Google reviews instead — no
story publishes without documented consent.

## 4. Google Business Profile access (for the reviews integration)

☐ From whoever manages the clinic's Google listing:

- Confirmation of which Google account owns the Business Profile
- Access to set up the reviews API (the integration syncs reviews
  server-side; it never invents or edits them)
- Confirmation that the listing's address/phone/hours match the site
  (they are the site's source of verified public facts)

Status: the reviews page and sync plumbing are being built so that with no
credentials it fails **honestly** (no fabricated live reviews). Setup will
be documented in `docs/google-reviews.md`.

## 5. SMS provider credentials (appointment notifications)

☐ If the clinic wants SMS confirmations/reminders:

- Provider choice (the adapter ships for MSG91; others can be added)
- Provider API key / auth settings
- **DLT registration details** (India): entity ID, approved header/sender ID,
  and approved message template IDs for each notification type
- Confirmation of per-message costs and monthly volume expectations
- Clinic sign-off on reminder timing (default: 24 hours before the visit)

Status: without credentials, appointment requests still work — the site
simply never claims a message was sent (each SMS job records
`skipped_unconfigured`). Setup will be documented in
`docs/booking-and-sms.md`.

## 6. Social profile links

☐ Verified URLs for any profile the clinic actually maintains and wants
linked (Facebook, Instagram, LinkedIn, YouTube). Blank = not displayed —
we will not link profiles we cannot verify belong to the clinic.

## 7. Final domain & DNS

☐ The production domain (and who controls DNS). This sets
`NEXT_PUBLIC_SITE_URL`, which drives canonical URLs, the sitemap,
robots.txt, and structured data. It also requires an HTTPS certificate —
mandatory for the installable PWA (service workers only register on HTTPS;
see `docs/deployment.md`).

## 8. Legal review

☐ An advocate's review of the site's **Privacy Policy** and **Terms of
Use** (drafted in plain English at /privacy and /terms). They are honest
about what data the forms collect, but they are **not legal documents**
until reviewed. Confirm:

- Data retention periods (the drafts state practices, the clinic must
  confirm them)
- Whether appointment-request data counts as health information requiring
  special handling, and the clinic's chosen safeguards
- Any registration/statutory numbers that should (or must not) appear

## 9. Confirmation of operational facts

☐ Items currently seeded as configurable drafts, needing clinic
confirmation before they are treated as final:

- **Operating hours** (Mon–Sat sessions; Sunday closed — confirm)
- The **six published service descriptions** (professional general copy,
  no outcome promises — read and approve each, or correct them)
- The three draft services (neurological rehab variants) — publish or drop
- Booking window settings (how many days ahead, earliest bookable date)
- Booking mode: internal request form vs. an external booking link
- Any **impact statistics** the clinic wants shown — each requires a note
  on how the number was verified; otherwise they stay off the site

## 10. Staffing the website

☐ Decisions the clinic needs to make:

- Who will staff the `/admin` interface (names + emails for admin accounts;
  each gets an individual login, never a shared one)
- Who monitors the public email inbox (raphaelphysiotherapyclinic@gmail.com)
  and how quickly enquiries should be answered
- Who is authorised to publish patient stories and verify consent
- A higher-resolution master of the logo, if one exists (the supplied
  artwork is 225×225; a larger or vector master would sharpen app icons)

---

### Summary table

| # | Item | Blocks | Risk if launched without |
|---|------|--------|--------------------------|
| 1 | Real facility photos | Final imagery | Placeholder photos misrepresent nothing (labelled) but undersell the centre |
| 2 | Therapist profiles | /team content | Team page stays an honest empty state |
| 3 | Patient stories + consent | /stories content | Stories page points to Google reviews instead |
| 4 | Google Business Profile access | Live reviews | Reviews show an honest "not configured" state |
| 5 | SMS credentials | SMS notifications | Requests work; no SMS is claimed as sent |
| 6 | Social links | Footer/social display | Links simply don't display |
| 7 | Final domain + DNS | Production deploy | Site cannot leave the staging URL |
| 8 | Legal review | Privacy/Terms final | Policies remain self-declared drafts |
| 9 | Hours/service confirmations | Final public facts | Configurable drafts keep serving |
| 10 | Admin staffing | Operations | First admin exists, but no operating procedure |

**Minimum honest launch set:** items 1, 7, 8, 9 (plus 10 for operations).
Items 2–6 gate features, not the launch itself — every one of them degrades
gracefully today.
