import { hasRealContact, overpass, userAgent } from "@/lib/config";
import { cached } from "@/lib/cache";
import type { OverpassResponse } from "./types";

/**
 * Overpass API client.
 *
 * Built to be a good citizen of volunteer-run, rate-limited, shared infrastructure. The etiquette
 * rules we are implementing, quoted from the Overpass wiki in docs/research/osm-data.md:
 *
 *   - "No parallel running of multiple scripts."      -> a process-wide mutex, below
 *   - "...divide those numbers by 100 if you set something up that uses the API regularly"
 *   - "If you receive an HTTP error code such as 429 or 406, pause for 30 seconds"
 *
 * A real 429 was hit during research after ~8 rapid sequential queries from one IP, plus
 * intermittent 504 gateway timeouts. Both are handled. So is the fact that
 * `overpass.private.coffee` returned 500 on every attempt from our network, which is why the
 * endpoint is configuration and not a constant.
 */

/**
 * Process-wide serialisation of every Overpass request.
 *
 * Each call chains onto the previous one, so concurrency collapses to a queue. Failures are
 * swallowed into the chain so one bad request cannot poison every request after it.
 */
let queue: Promise<unknown> = Promise.resolve();

export function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const result = queue.then(run, run);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export class OverpassError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly query?: string,
  ) {
    super(message);
    this.name = "OverpassError";
  }
}

export type RunResult = { elements: OverpassResponse["elements"]; elapsedMs: number; cached: boolean };

/**
 * Run an Overpass QL query.
 *
 * Retry policy, from the observed behaviour plus the documented guidance:
 *   - 400 (malformed query) fails immediately. Retrying a broken query wastes the server's time.
 *   - 429 / 406 -> wait the full 30s cooldown, then retry.
 *   - 504 / network errors -> short exponential backoff.
 *   - 429 is rate-limiting, so we also drop the cache-free path and back off hard rather than
 *     hammering a struggling volunteer machine.
 */
async function runOnce(query: string, timeoutMs: number): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(overpass.endpoint, {
      method: "POST",
      // POST rather than GET: long queries do not belong in a URL, and a GET is more likely to be
      // rejected by a proxy in front of the endpoint.
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Without a real User-Agent this may be refused outright, which is the correct outcome for
        // an application that cannot identify itself. See hasRealContact.
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const body = await response.text();

    if (!response.ok) {
      throw new OverpassError(
        `Overpass returned ${response.status} ${response.statusText}: ${body.slice(0, 300)}`,
        response.status,
        query,
      );
    }

    let parsed: OverpassResponse;
    try {
      parsed = JSON.parse(body) as OverpassResponse;
    } catch {
      // Overpass sometimes answers 200 with an HTML error page when it is unwell.
      throw new OverpassError(`Overpass returned non-JSON: ${body.slice(0, 300)}`, response.status, query);
    }

    // A runtime error inside Overpass comes back as a remark with a 200 status.
    if (parsed.remark && !parsed.elements) {
      throw new OverpassError(`Overpass error: ${parsed.remark}`, 200, query);
    }

    return parsed;
  } catch (error) {
    if (error instanceof OverpassError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new OverpassError(`Overpass timed out after ${timeoutMs}ms`, undefined, query);
    }
    throw new OverpassError(
      `Overpass request failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      query,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * One radius is one cache key. Cache long: map data does not change in seconds, and a hunt built
 * at home gets played an hour later in a park with no signal.
 */
const TTL_MS = 6 * 60 * 60 * 1000;

export async function runOverpass(query: string, options?: { fresh?: boolean }): Promise<RunResult> {
  const key = `overpass:${query}`;
  const timeoutMs = overpass.timeoutSeconds * 1000;

  if (options?.fresh) {
    const started = Date.now();
    const result = await enqueue(() => retry(query, timeoutMs));
    return { elements: result.elements, elapsedMs: Date.now() - started, cached: false };
  }

  const started = Date.now();
  const result = await cached(key, TTL_MS, () => enqueue(() => retry(query, timeoutMs)));
  // Time to serve, not time to fetch. That distinction matters when reading CLI output.
  return { elements: result.elements, elapsedMs: Date.now() - started, cached: true };
}

async function retry(query: string, timeoutMs: number): Promise<OverpassResponse> {
  const backoffs = overpass.backoffMs;
  let lastError: unknown;

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    if (attempt > 0) {
      const isLast = attempt === backoffs.length;
      const waitMs = isLast ? 0 : overpass.cooldownMs;
      if (waitMs > 0) {
        console.warn(
          `[overpass] ${lastError instanceof OverpassError ? lastError.status : "error"} - ` +
            `sleeping ${Math.round(waitMs / 1000)}s as the API asks, then retrying (${attempt}/${backoffs.length})`,
        );
        await sleep(waitMs);
      } else {
        const waitMsShort = backoffs[attempt - 1] ?? 1000;
        await sleep(waitMsShort);
      }
    }

    try {
      return await runOnce(query, timeoutMs);
    } catch (error) {
      lastError = error;

      // A malformed query will never succeed. Fail fast rather than making the server read it again.
      if (error instanceof OverpassError && error.status === 400) throw error;

      // Out of retries.
      if (attempt === backoffs.length) break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OverpassError("Overpass request failed for an unknown reason");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Warn once, not once per request. */
let warnedAboutContact = false;
export function checkEtiquette(): void {
  if (hasRealContact || warnedAboutContact) return;
  warnedAboutContact = true;
  console.warn(
    "[overpass] SPHINX_CONTACT_URL / SPHINX_CONTACT_EMAIL are not set.\n" +
      "           Both Nominatim and Overpass rate-limit by User-Agent, and Nominatim returned 403\n" +
      "           during testing for a User-Agent containing example.org. Requests may be refused\n" +
      "           until you set a real contact. See .env.example.",
  );
}