/**
 * Raphael Physiotherapy & Rehabilitation Centre — service worker.
 *
 * Hand-written plain JavaScript (no libraries, no code generation).
 *
 * Strategy:
 *  - Same-origin static assets (images, icons, fonts, and Next.js's
 *    content-hashed /_next/static build output) are served CACHE-FIRST from
 *    a versioned cache. Hashed build assets are immutable, so this can never
 *    serve stale application code.
 *  - Page navigations are NETWORK-FIRST: the live page always wins when the
 *    network is reachable (and refreshes the copy in the cache); when the
 *    network fails, the last-seen public page is used; if that is missing
 *    too, a small inline offline page is returned — warm, honest, with the
 *    clinic's phone number.
 *  - Non-GET requests (form submissions such as POST /book or /api/contact)
 *    are NEVER intercepted: when offline they fail in the browser honestly
 *    instead of being answered from a cache.
 *  - /admin and /api are never intercepted at all — administrative pages,
 *    API responses, and anything authentication-related must never pass
 *    through, or be stored in, this public cache. Pages carrying a
 *    Set-Cookie header are never stored either.
 *
 * Updates: bump the cache name suffixes (v1 → v2) when changing what is
 * cached; `activate` deletes every cache that is no longer listed, and the
 * worker calls skipWaiting()/clients.claim() so visitors pick up the new
 * worker promptly instead of being stranded on the old one.
 *
 * Deliberately NOT included: web push / notifications (not requested).
 */

const STATIC_CACHE = "rph-static-v1";
const PAGES_CACHE = "rph-pages-v1";
const KNOWN_CACHES = [STATIC_CACHE, PAGES_CACHE];

/** Path prefixes this worker must never touch (private/administrative). */
const BYPASSED_PREFIXES = ["/admin", "/api"];

/** Extensions treated as cacheable static assets. */
const STATIC_EXTENSIONS =
 /\.(png|jpe?g|svg|webp|avif|gif|ico|woff2?|ttf|otf|eot|css)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Pre-cache the brand icons so the inline offline page always has its
      // emblem. Each fetch is individually tolerant: a failed download must
      // never block installation.
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        [
          "/icons/icon.svg",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          "/icons/maskable-192.png",
          "/icons/maskable-512.png",
        ].map((asset) => cache.add(asset).catch(() => undefined)),
      );
      // Take over as soon as the new worker is ready (no stuck old versions).
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches from previous service-worker versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !KNOWN_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      );
      // Start controlling pages opened before this worker activated.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only manage same-origin GET requests. POST/PUT/PATCH/DELETE submissions
  // (booking requests, contact form, admin actions) go straight to the
  // network and fail honestly when there is no connection.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept the service worker itself (the browser must always be
  // able to fetch a fresh copy) or the manifest.
  if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") {
    return;
  }

  // Administrative and API surfaces: skip entirely.
  if (BYPASSED_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix + "/"))) {
    return;
  }

  if (isStaticAsset(request, url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Anything else (e.g. RSC payloads, data requests): default browser
  // behaviour — pass through untouched.
});

/** Cache-first for immutable public assets. */
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline and not previously cached: fail honestly (no fake content).
    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** Network-first for public page navigations, with an offline fallback. */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      // Keep the last good copy of public pages for offline reading.
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlinePage();
  }
}

/**
 * Only cache same-origin ("basic") responses that returned successfully and
 * do not carry authentication state. This is the guard that keeps anything
 * private out of the public caches.
 */
function isCacheableResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  if (response.headers.get("set-cookie")) return false;
  return true;
}

function isStaticAsset(request, pathname) {
  // Next.js immutable, content-hashed build output (JS/CSS chunks).
  if (pathname.startsWith("/_next/static/")) return true;
  // Brand icons and site photography.
  if (pathname.startsWith("/icons/") || pathname.startsWith("/images/")) {
    return true;
  }
  if (request.destination === "image" || request.destination === "font") {
    return true;
  }
  return STATIC_EXTENSIONS.test(pathname);
}

/**
 * Inline offline fallback for public pages — no network fetch needed, so it
 * works even on first visit. Warm, honest, and phone-first: it never claims
 * anything was submitted or is live, and always offers the clinic's numbers.
 */
function offlinePage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>You're offline — Raphael Physiotherapy &amp; Rehabilitation Centre</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #F8F5EF;
    color: #2B2420;
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.6;
  }
  main { max-width: 480px; text-align: center; }
  .emblem {
    width: 72px; height: 72px; margin: 0 auto 20px;
    display: block;
  }
  h1 {
    font-size: 28px; font-weight: 600; margin: 0 0 12px;
    letter-spacing: -0.01em;
  }
  p { margin: 0 0 16px; font-size: 16px; color: #4A403A; }
  .calls { margin: 28px 0 12px; display: flex; flex-direction: column; gap: 10px; }
  .calls a {
    display: block;
    background: #2B2420;
    color: #F8F5EF;
    text-decoration: none;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 17px;
    padding: 14px 20px;
    border-radius: 10px;
  }
  .calls a:last-child { background: transparent; color: #2B2420; border: 1px solid #2B2420; }
  .small { font-size: 13px; color: #6B5F57; margin-top: 24px; }
</style>
</head>
<body>
<main>
  <img class="emblem" src="/icons/icon-192.png" alt="" width="72" height="72">
  <h1>You&rsquo;re offline</h1>
  <p>This page needs an internet connection, and your device can&rsquo;t reach the centre&rsquo;s website right now. Nothing you typed has been lost or sent.</p>
  <p>You can still reach us directly:</p>
  <div class="calls">
    <a href="tel:+919959274929">Call +91 99592 74929</a>
    <a href="tel:08832470757">Call 0883 247 0757</a>
  </div>
  <p class="small">Raphael Physiotherapy &amp; Rehabilitation Centre<br>
  Jampet Road, Rajamahendravaram &mdash; beside Sunstar Hospital.<br>
  Please try again once you&rsquo;re back online.</p>
</main>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    statusText: "Offline",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
