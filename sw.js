/*
 * Sphinx service worker.
 *
 * Plain JavaScript, no build step, served from /sw.js. Deliberately not a workbox-style generated
 * worker: a service worker is the single most likely place for this app to accidentally phone home,
 * and the privacy claim in PROJECT_CONTEXT.md section 4 is only credible if that file is small enough
 * to read in full.
 *
 * ---------------------------------------------------------------------------
 * SCOPE - THIS WORKER ONLY EVER CACHES ITS OWN ORIGIN
 * ---------------------------------------------------------------------------
 * OpenStreetMap's tile usage policy states that "offline use is not permitted on
 * tile.openstreetmap.org", explicitly listing prefetch and download-a-city-for-offline as
 * prohibited. This app uses no map tiles at all, which sidesteps that entirely.
 *
 * If a request is for another origin, it is passed straight through to the network and NEVER cached.
 * That is enforced here rather than left to discipline, and scripts/check-privacy.ts asserts it.
 * ---------------------------------------------------------------------------
 */

const VERSION = "v3";
const SHELL_CACHE = `sphinx-shell-${VERSION}`;
const PAGE_CACHE = `sphinx-pages-${VERSION}`;
const ASSET_CACHE = `sphinx-assets-${VERSION}`;

/** Precache the minimum needed for a cold offline start. */
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 does not fail the whole install.
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("sphinx-") && ![SHELL_CACHE, PAGE_CACHE, ASSET_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Lets a parent panel ask the worker to drop every cached page - used by "clear everything",
  // which matters for a children's app.
  if (event.data === "sphinx:clear-pages") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});

/** Cacheable Next.js build output is content-hashed, so it can be cached forever. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET, and only our own origin. Everything else goes straight to the network, uncached.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the hunt API. Building a hunt hits volunteer-run OpenStreetMap infrastructure, and a
  // cached hunt response would silently hide a fresh map from the user.
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build assets: cache first, they can never change.
  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Navigations: try the network, fall back to cache. Network-first means a deployed fix reaches a
  // child as soon as they have signal, and a hunt played offline still works.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request, { cacheName: PAGE_CACHE });
          if (cached) return cached;
          const shell = await caches.match("/", { cacheName: SHELL_CACHE });
          if (shell) return shell;
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Sphinx</title>" +
              "<body style='font:16px system-ui;padding:2rem;max-width:32rem;margin:auto'>" +
              "<h1>Sphinx is offline</h1>" +
              "<p>This page has not been opened on this device before, so there is nothing cached " +
              "for it. Open a hunt you have already built and it will work with no signal at all.</p>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});