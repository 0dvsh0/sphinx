import { NextResponse } from "next/server";
import { geocode, GeocodeError } from "@/lib/osm/nominatim";
import { buildCandidatePool } from "@/lib/osm/candidates";
import { composeHunt } from "@/lib/riddles/compose";
import { checkEtiquette } from "@/lib/osm/overpass";
import { app, hunt as huntConfig } from "@/lib/config";
import type { HuntArtifact } from "@/lib/riddle";

/**
 * POST /api/hunt - build a hunt around a place.
 *
 * This route exists for three reasons, all of them load-bearing:
 *
 * 1. USER-AGENT AND RATE LIMITS. Nominatim 403s placeholder domains and both services limit by
 *    User-Agent. That must happen server-side, not from a browser, or the app identifies itself with
 *    whatever User-Agent the browser sets.
 * 2. THE BROWSER MAKES NO OSM CALLS. See scripts/check-privacy.ts - the privacy claim is only
 *    credible if no request to a third party originates from the client.
 * 3. OFFLINE BUILD. The hunt is generated once, here, while there is a signal. The phone then plays
 *    it in a park with no connection at all.
 *
 * No API key is required. The riddle writer is the template fallback, so this route works on a
 * deployed instance with nothing configured.
 */

export const runtime = "nodejs";
// Never cached: building a hunt hits volunteer-run infrastructure, and the in-process caches in
// lib/cache.ts already handle repeat requests within a single instance.
export const dynamic = "force-static";

type RequestBody = {
  place?: string;
  lat?: number;
  lon?: number;
  count?: number;
};

const MAX_COUNT = huntConfig.maxCandidates;

export async function POST(request: Request) {
  checkEtiquette();

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  // Either an explicit position or a place name to geocode.
  let place: { name: string; lat: number; lon: number };
  if (typeof body.lat === "number" && typeof body.lon === "number") {
    if (Math.abs(body.lat) > 90 || Math.abs(body.lon) > 180) {
      return NextResponse.json({ error: "That is not a position on Earth." }, { status: 400 });
    }
    place = { name: body.place?.trim() || `${body.lat.toFixed(4)}, ${body.lon.toFixed(4)}`, lat: body.lat, lon: body.lon };
  } else if (typeof body.place === "string" && body.place.trim()) {
    try {
      place = await geocode(body.place.trim());
    } catch (error) {
      if (error instanceof GeocodeError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } else {
    return NextResponse.json({ error: "Give a place name or a lat,lon position." }, { status: 400 });
  }

  const count = Math.max(1, Math.min(MAX_COUNT, Math.floor(body.count ?? 12)));

  /*
   * Ask for far more candidates than stops. Roughly a third of screened candidates survive to a real
   * riddle - the rest are thin, duplicated, or rationed away by the child-safety rules. Targeting
   * `count` candidates would produce a three-stop hunt and report success.
   */
  const pool = await buildCandidatePool(place.lat, place.lon, {
    target: Math.max(Math.round(count * 2.5), huntConfig.minCandidates),
  });

  const { stops, skipped } = composeHunt(pool, count);

  if (stops.length === 0) {
    return NextResponse.json(
      {
        error:
          `Nothing playable near ${place.name}. OpenStreetMap may simply be thin here - which is ` +
          "itself worth knowing. Try a larger town, or a place with more mapped memorials.",
        place,
        candidates: pool.candidates.length,
        rejected: pool.rejected.length,
        skipped,
      },
      { status: 422 },
    );
  }

  const artifact: HuntArtifact = {
    id: buildHuntId(place.name),
    placeName: place.name,
    centre: { lat: place.lat, lon: place.lon },
    radiusMetres: pool.radiusMetres,
    generatedAt: new Date().toISOString(),
    generator: "template-fallback",
    stops,
  };

  return NextResponse.json({
    hunt: artifact,
    /** Reported so the parent screen can be honest about what the builder threw away. */
    report: {
      candidates: pool.candidates.length,
      rejected: pool.rejected.length,
      skipped: skipped.length,
      radiusMetres: pool.radiusMetres,
      attempts: pool.attempts,
      partial: stops.length < count,
      askedFor: count,
    },
  });
}

/** Stable, readable id so a hunt can be linked to and re-opened. */
function buildHuntId(placeName: string): string {
  const slug = placeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `hunt-${slug}-${Date.now().toString(36)}`;
}

export async function GET() {
  return NextResponse.json(
    {
      name: app.name,
      usage: {
        method: "POST",
        body: { place: "string (place name) OR lat: number, lon: number", count: `number, max ${MAX_COUNT}` },
      },
      notes: [
        "No API key required.",
        "Riddles are written from OSM tags alone, and every claim is traced to its source tag.",
        "Overpass and Nominatim are volunteer-run. Requests are serialised and cached.",
      ],
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}