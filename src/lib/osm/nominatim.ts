import { nominatim, userAgent } from "@/lib/config";
import { cached } from "@/lib/cache";
import type { Place } from "./types";

/**
 * Nominatim geocoding, for turning "Bristol" into a place to build a hunt around.
 *
 * Nominatim's usage policy is stricter than Overpass's and we treat it as a hard constraint:
 *
 *   - "No heavy uses (an absolute maximum of 1 request per second)."
 *   - "Provide a valid HTTP Referer or User-Agent identifying the application."
 *   - "Clearly display attribution"  -> handled by the OsmAttribution component.
 *   - "periodic requests from apps are considered bulk geocoding and as such are strongly
 *      discouraged" -> we only geocode on an explicit user action, never in the background.
 *   - "systematic queries" such as reverse-geocoding a grid to enumerate every POI are forbidden.
 *     That is why the hunt builder is user-triggered for ONE place rather than crawling.
 *
 * Reference: https://operations.osmfoundation.org/policies/nominatim/
 */

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // Place names do not change. Cache hard.

/** Enforces the 1 req/sec policy across the whole process. */
let lastRequestAt = 0;

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + nominatim.minIntervalMs - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodeError";
  }
}

export async function geocode(query: string): Promise<Place> {
  const trimmed = query.trim();
  if (!trimmed) throw new GeocodeError("Nothing to search for.");

  const key = `nominatim:${trimmed.toLowerCase()}`;
  const url =
    `${nominatim.endpoint}/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(trimmed)}`;

  const results = await cached(key, TTL_MS, async () => {
    await respectRateLimit();

    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 403) {
      throw new GeocodeError(
        "Nominatim refused the request (403). This is almost always the User-Agent. Set " +
          "SPHINX_CONTACT_URL and SPHINX_CONTACT_EMAIL to something real - placeholder domains " +
          "like example.org are rejected. See docs/research/osm-data.md.",
      );
    }
    if (response.status === 429) {
      throw new GeocodeError("Nominatim is rate-limiting us (429). Wait a moment and try again.");
    }
    if (!response.ok) {
      throw new GeocodeError(`Nominatim returned ${response.status} ${response.statusText}.`);
    }

    return (await response.json()) as NominatimResult[];
  });

  const first = results[0];
  if (!first) throw new GeocodeError(`Could not find "${trimmed}". Try a larger place name, like a town or city.`);

  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new GeocodeError(`Nominatim gave an unusable position for "${trimmed}".`);
  }

  return {
    name: first.display_name.split(",")[0]?.trim() || trimmed,
    lat,
    lon,
    osmType: first.osm_type,
    osmId: first.osm_id ? Number(first.osm_id) : undefined,
  };
}

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  osm_type?: string;
  osm_id?: number;
};