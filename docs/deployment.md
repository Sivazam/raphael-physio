# Deployment guide

How to take Raphael Physiotherapy & Rehabilitation Centre's website from
this repository to a running production server.

**Stack:** Next.js 16 (App Router, standalone output) · TypeScript ·
Tailwind CSS 4 · Prisma + SQLite · Bun as the package manager/runtime.
The app listens on **port 3000** and expects to sit behind a TLS-terminating
reverse proxy (Caddy examples below).

> Pre-launch content requirements live in `docs/content-needed.md` —
> deployment is possible without them, an honest launch is not.

---

## 1. Prerequisites

- **Bun 1.1+** (recommended — scripts assume it) or Node.js 20+
- A Linux host or VM with ~1 GB RAM free (the Next server idles far below
  that; builds want more headroom)
- A domain name pointed at the host (A/AAAA record), with ports 80 + 443
  open
- SQLite needs no server — the database is a single file on disk

## 2. Install

```bash
git clone <repository-url> raphaelphysio
cd raphaelphysio
bun install
```

## 3. Environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | SQLite path, e.g. `file:/srv/raphaelphysio/db/custom.db` (absolute is clearest in production). The file is created by `db push` in step 4. |
| `ADMIN_SESSION_SECRET` | yes | Signs admin session cookies. Generate: `openssl rand -hex 32`. **The fallback value must never reach production.** |
| `ADMIN_EMAIL` | seed only | First admin login, used by `bun run db:seed`. |
| `ADMIN_PASSWORD` | seed only | First admin password — change it inside `/admin` after first sign-in. |
| `ADMIN_NAME` | seed only | Display name for the first admin account. |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://yourdomain.example` — **no trailing slash**. Drives canonical URLs, sitemap, robots.txt, structured data. Baked in at build time, so set it *before* building. |

**Google reviews / SMS provider variables** (API keys, DLT sender IDs,
template IDs) are documented in `docs/google-reviews.md` and
`docs/booking-and-sms.md` once that integration ships. Until credentials
are configured, both features fail honestly — no fake reviews, no false
"message sent" claims. Do not invent values.

Never commit `.env` (it is git-ignored) and never copy production secrets
into `.env.example`.

## 4. Database

```bash
# Create/verify the schema (note: the repo script passes --accept-data-loss,
# safe on an empty database — for an existing production DB, review
# prisma/schema.prisma changes first or take a backup before running it)
bun run db:push

# Seed verified contact details, service/exercise content, hours,
# and the first admin account (reads ADMIN_* variables)
bun run db:seed
```

`db:seed` is idempotent (upserts) — safe to re-run; it will not overwrite
content edited through `/admin` afterwards (settings use `update: {}`).

**Backups:** copy the SQLite file (and any `-journal` sibling) on a
schedule; that file *is* the database.

## 5. First admin login

1. Browse to `https://yourdomain.example/admin`
2. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (from the seed step)
3. Change the password immediately, then create individual accounts for
   each staff member (admin UI — see the admin section of the project)
4. The session cookie is signed with `ADMIN_SESSION_SECRET`; rotating that
   secret logs everyone out

## 6. Build and run

```bash
bun run build     # next build (standalone output) + copies static/public
bun run start     # runs .next/standalone/server.js on port 3000
```

Run it under a process supervisor so it restarts on crashes/reboots. With
systemd:

```ini
# /etc/systemd/system/raphaelphysio.service
[Unit]
Description=Raphael Physiotherapy website
After=network.target

[Service]
WorkingDirectory=/srv/raphaelphysio
EnvironmentFile=/srv/raphaelphysio/.env
ExecStart=/usr/bin/env bun /srv/raphaelphysio/.next/standalone/server.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

(Adjust paths/user to the host. The standalone server needs the `.env`
values supplied through the environment — see `EnvironmentFile`.)

## 7. Reverse proxy & TLS (Caddy)

The app itself speaks HTTP on port 3000. Terminate TLS in front of it:

```caddyfile
raphaelphysio.example {
    encode zstd gzip
    reverse_proxy localhost:3000
}
```

Caddy obtains and renews the certificate automatically. Any equivalent
proxy (nginx, Traefik) works — what matters:

- HTTPS with a valid certificate on the public domain
- `X-Forwarded-Proto` / `Host` forwarded unchanged (Caddy does this by
  default)

The repo also contains a sandbox `Caddyfile` (`:81 → localhost:3000`)
used for local preview — it is **not** a production configuration.

## 8. PWA / HTTPS requirements

The site is an installable PWA:

- **Manifest** — `src/app/manifest.ts` is served at
  `/manifest.webmanifest` (Next.js links it in `<head>` automatically).
  Icons live in `public/icons/` and are regenerated from the clinic logo
  by `bun scripts/prepare-assets.ts`.
- **Service worker** — `public/sw.js`, registered from
  `src/components/pwa/register-sw.tsx`. Registration happens **only over
  HTTPS (or localhost)** — without a valid certificate the worker never
  registers and the site works as a normal website. This is why the
  reverse proxy in step 7 is not optional.
- Offline behaviour: public pages fall back to a warm inline "You're
  offline" page with the clinic's phone numbers; form submissions
  (POST /book, /api/contact) are never intercepted, so an offline
  submission fails visibly instead of pretending to succeed.
- `/admin` and `/api` are never touched by the service worker.

Verify after deploying: browser DevTools → Application → Manifest (should
show the clinic name and icons) and Service Workers ("activated"). Test
offline via DevTools → Network → "Offline" and reload a public page.

## 9. Updating a deployment

```bash
cd /srv/raphaelphysio
systemctl stop raphaelphysio        # (or your supervisor's stop)
git pull
bun install
bun run db:push                     # only if prisma/schema.prisma changed
bun run build
systemctl start raphaelphysio
```

Visitors pick up new application code on their next page load: page HTML
is always fetched network-first, and Next's hashed `/_next/static`
assets are immutable. If you change what `public/sw.js` caches, bump the
cache names (`rph-static-v1` → `v2`) — old caches are purged automatically
on activation.

## 10. Local development (reference)

```bash
bun install
bun run db:push
bun run db:seed
bun run dev        # http://localhost:3000, logs to dev.log
```

The service worker also registers on `localhost`, so PWA behaviour can be
developed locally without TLS.

## 11. Serverless deployment (Vercel & friends)

The clinic's SQLite database is a **local file** (`db/custom.db`) plus a
git-ignored `.env` — neither travels with a git-push deployment, and
Vercel's serverless filesystem could not host SQLite writes anyway. The
site handles this through a **dual-path data layer** (`src/lib/store.ts`):

- **With a database** (local dev, a VPS per sections 1–10): everything runs
  on SQLite via Prisma exactly as documented above.
- **Without a database** (Vercel): every admin/dashboard/booking/contact
  query transparently falls back to the clinic's **Firebase project**
  (Firestore via plain HTTPS REST — the project runs in test mode with
  open rules, which is what allows the serverless writes). Firebase web
  config is baked into `src/lib/firebase-config.ts`, so **no environment
  variables are required for the deployment to work**.

What works on Vercel out of the box:

- Public pages render from the baked content snapshot (Task 18 design:
  fast, static, resilient)
- **Admin sign-in** — Firebase email/password (or Google) exchanges the ID
  token for the clinic session at `/api/admin/auth/firebase`; authorization
  resolves through AdminUser rows → `ADMIN_FIREBASE_EMAILS` env → Firestore
  `admins` docs → the baked clinic identity
- The **full admin dashboard** (appointments, messages, services,
  exercises, team, stories, settings) reads and writes Firestore
- **Booking + contact submissions** create Firestore documents (fresh
  conflict re-check per slot; double-booking guard preserved)

Environment variables worth setting on Vercel (all optional but
recommended):

| Variable | Why |
|---|---|
| `ADMIN_SESSION_SECRET` | Sessions currently fall back to a known dev value when unset — **set a strong `openssl rand -hex 32` here** so admin cookies can't be forged by anyone holding the source. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs / sitemap / robots for the production domain (baked at build time). |
| `ADMIN_FIREBASE_EMAILS` | Extra Google-account emails allowed to sign in (comma-separated). |
| `FIRESTORE_SERVER_FALLBACK` | Set to `disabled` to turn the server-side Firestore path off entirely. |

Operational notes:

- `bun run db:seed-firestore` (i.e. `scripts/firestore-seed.ts`) mirrors
  the local SQLite content (services, exercises, categories, team,
  stories, hours, settings, admins) into Firestore. Run it after making
  local content edits you want reflected on Vercel. It never touches the
  live `appointments` / `messages` collections.
- Content edits made **through the Vercel admin UI** write to Firestore and
  appear in the admin immediately; the public pages keep serving the baked
  snapshot until the next deploy (the Task 18 policy — content changes ship
  with a release).
- **Security caveat (test mode):** the Firestore rules are wide open by
  choice today. Anyone who knows the project id can read/write those
  collections. Before the clinic stores meaningful patient data there,
  tighten the rules and/or move server writes to a service account
  (`FIREBASE_SERVICE_ACCOUNT_KEY`). Appointment requests currently hold
  name + phone only — the same data the contact form collects.
- `appointments` / `messages` live ONLY in Firestore on Vercel (the local
  SQLite never sees them) and only in SQLite locally — pick one environment
  as your operational console and stick to it.

## 12. Pre-launch checklist

1. Every item in `docs/content-needed.md` resolved or consciously deferred
2. `.env` uses a strong `ADMIN_SESSION_SECRET`, real domain in
   `NEXT_PUBLIC_SITE_URL`, and a changed first-admin password
3. HTTPS live and green; manifest + service worker verified in DevTools
4. `/sitemap.xml` and `/robots.txt` return the production domain
5. A database backup exists and is scheduled
6. An advocate has reviewed /privacy and /terms
