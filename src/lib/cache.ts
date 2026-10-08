/**
 * A tiny in-memory TTL cache with single-flight de-duplication.
 *
 * Why this exists and not a real cache: Overpass and Nominatim are volunteer-run, rate-limited,
 * shared infrastructure that costs the whole OSM community. Every repeated request we avoid is
 * load we did not put on a stranger's server. See docs/research/osm-data.md for the etiquette
 * rules we are respecting.
 *
 * Deliberately in-process. Durable caching lands with the offline hunt store in increment 3, where
 * there is already somewhere sensible to put it.
 */

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
/** In-flight requests, so N concurrent callers cause ONE upstream request, not N. */
const inFlight = new Map<string, Promise<unknown>>();

/** Entries are cheap and the working set is small (one city at a time). */
const MAX_ENTRIES = 500;

function evictIfNeeded(): void {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
  // Still over budget: drop the oldest. Map preserves insertion order.
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/**
 * Cached fetch. Concurrent callers for the same key share one request.
 *
 * `ttlMs` should be long. Map data does not change in seconds, and a hunt built at home gets
 * played an hour later in a park.
 */
export async function cached<T>(key: string, ttlMs: number, run: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;

  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = run()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      evictIfNeeded();
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Test/CLI helper: forget everything. */
export function clearCache(): void {
  store.clear();
  inFlight.clear();
}

export function cacheSize(): number {
  return store.size;
}