import type { Candidate, ScoredPool } from "@/lib/osm/types";
import { classifySensitivity, type Sensitivity } from "@/lib/osm/safety";
import { lintRiddle } from "./lint";
import { writeTemplateRiddle, type Clue } from "./template-fallback";
import { signatureFor, SIGNATURES, type VisualSignatureId } from "@/lib/vision/signatures";
// One definition of a hunt stop, shared with the API route, the CLI and IndexedDB. It used to be
// declared here as well, which is how `visual` ended up on one copy and not the other.
import type { HuntStop } from "@/lib/riddle";

/**
 * Turning a pool of scored features into an ordered hunt.
 *
 * Composition is where the safety rules stop being a filter and become a design. Two of them:
 *
 * 1. RESPECT RATIONING. Memorials are the best riddle material in OSM and the war memorial riddle
 *    is the whole demo - so we do not exclude them. But a hunt of five war memorials in a row is a
 *    bleak and repetitive thing to ask a child to walk, and treating grief as an arcade is exactly
 *    the failure mode PROJECT_CONTEXT.md section 2.4 warns about. So `respect` features are capped
 *    as a fraction of the hunt.
 *
 * 2. VARIETY. Three drinking fountains in a row is a bad walk even if each one is individually
 *    fine. We cap repeats per category so the route feels like a walk through a place rather than a
 *    scavenger hunt for one type of thing.
 */

/**
 * Resolve a feature's visual signature.
 *
 * Derived from the same tags as the riddle, so the photo check and the riddle can never disagree
 * about what the object is. Returns null when nothing matches - and null is passed through to the
 * device rather than defaulted to a generic "building", which would match almost any street and
 * would therefore be a lie.
 */
export function visualHintFor(candidate: Candidate): { id: VisualSignatureId; text: string } | null {
  const id = signatureFor(candidate.tags, candidate.category);
  if (!id) return null;
  const signature = SIGNATURES.find((s) => s.id === id);
  return signature ? { id: signature.id, text: signature.text } : null;
}

/**
 * A composed stop. Re-exported from @/lib/riddle so there is exactly one shape in the system.
 */
export type { HuntStop };

export type ComposedHunt = {
  stops: HuntStop[];
  /** Features that passed screening but could not be used. Useful for the CLI report. */
  skipped: { name: string; reason: string }[];
};

export type ComposeOptions = {
  /** Never fill more than this fraction of the hunt with `respect` features. */
  maxRespectFraction?: number;
  /** Most stops sharing one category. */
  maxPerCategory?: number;
  /** Roughly how many metres between consecutive stops, for a walkable order. */
  spacingMetres?: number;
};

const DEFAULTS: Required<ComposeOptions> = {
  // A quarter. Enough that the war memorial can absolutely feature; never enough that a hunt becomes
  // a memorial tour.
  maxRespectFraction: 0.25,
  maxPerCategory: 3,
  spacingMetres: 120,
};

const EARTH_RADIUS_M = 6_371_000;

function haversineMetres(a: Candidate, b: Candidate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Widest-first nearest-neighbour: start at the best stop, then keep the closest unused one. */
function orderAsWalk(pool: Candidate[]): Candidate[] {
  if (pool.length <= 1) return pool;
  const remaining = [...pool];
  const ordered: Candidate[] = [remaining.shift()!];
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const distance = haversineMetres(ordered[ordered.length - 1], remaining[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ordered;
}

export function composeHunt(pool: ScoredPool, count: number, options: ComposeOptions = {}): ComposedHunt {
  const opts = { ...DEFAULTS, ...options };
  const stops: HuntStop[] = [];
  const skipped: { name: string; reason: string }[] = [];

  const maxRespect = Math.max(1, Math.round(count * opts.maxRespectFraction));
  const perCategory = new Map<string, number>();
  let respectCount = 0;
  /** Two stops that read identically make a walk feel like a loop. */
  const usedRiddles = new Set<string>();

  // High score first, so rationing decisions prefer the most riddle-worthy features.
  const byScore = [...pool.candidates].sort((a, b) => (b.score - a.score) || (a.osmId - b.osmId));
  const selected: Candidate[] = [];

  for (const candidate of byScore) {
    if (selected.length >= count) break;

    const name = candidate.tags.name ?? "";

    const used = perCategory.get(candidate.category) ?? 0;
    if (used >= opts.maxPerCategory) {
      skipped.push({ name: name || `${candidate.category} #${candidate.osmId}`, reason: `too many ${candidate.category} stops` });
      continue;
    }

    const sensitivity = classifySensitivity(candidate.tags).sensitivity;

    if (sensitivity === "respect" && respectCount >= maxRespect) {
      skipped.push({ name, reason: "respect-feature ration (child-safety, see safety.ts)" });
      continue;
    }

    // Compose now rather than later, so a feature that cannot produce a safe, non-thin riddle is
    // dropped here instead of shipping bland text.
    const draft = writeTemplateRiddle(candidate, sensitivity);

    /*
     * A last-resort riddle is decoration, and decoration is the thing the charter forbids. A
     * feature with only a `name` and a `category` carries no riddle material - there is nothing a
     * child could walk up and check. So we skip it and say so, rather than pad the hunt with
     * "Something here is on the map".
     */
    if (draft.frameId === "last-resort") {
      skipped.push({
        name: name || `${candidate.category} #${candidate.osmId}`,
        reason: "not enough OSM detail to write a true riddle (name and category only)",
      });
      continue;
    }

    const riddleLint = lintRiddle({ text: draft.riddle, kind: "riddle", name });
    if (!riddleLint.ok) {
      skipped.push({ name, reason: `riddle rejected by lint: ${riddleLint.violations[0].message}` });
      continue;
    }
    const factLint = lintRiddle({ text: draft.fact, kind: "fact" });
    if (!factLint.ok) {
      skipped.push({ name, reason: `fact rejected by lint: ${factLint.violations[0].message}` });
      continue;
    }

    const fingerprint = draft.riddle.toLowerCase();
    if (usedRiddles.has(fingerprint)) {
      skipped.push({ name, reason: "duplicate riddle text - another stop already reads like this" });
      continue;
    }
    usedRiddles.add(fingerprint);

    perCategory.set(candidate.category, used + 1);
    if (sensitivity === "respect") respectCount++;
    selected.push(candidate);
  }

  // Order for walking only once the set is final, so rationing is not skewed by geography.
  const ordered = orderAsWalk(selected);

  for (const candidate of ordered) {
    const sensitivity = classifySensitivity(candidate.tags).sensitivity;
    const draft = writeTemplateRiddle(candidate, sensitivity);

    stops.push({
      id: `${candidate.osmType}/${candidate.osmId}`,
      riddle: draft.riddle,
      fact: draft.fact,
      clues: draft.clues,
      visual: visualHintFor(candidate),
      category: candidate.category,
      sensitivity,
      score: candidate.score,
      lat: candidate.lat,
      lon: candidate.lon,
      name: candidate.tags.name ?? "",
      frameId: draft.frameId,
      osmUrl: `https://www.openstreetmap.org/${candidate.osmType}/${candidate.osmId}`,
    });
  }

  return { stops, skipped };
}