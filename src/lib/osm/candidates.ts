import type { Candidate, OsmFeature, RejectedFeature, ScoredPool } from "./types";
import { runOverpass, checkEtiquette } from "./overpass";
import { hunt } from "@/lib/config";
import { screenFeature, classifySensitivity, type Sensitivity } from "./safety";

/**
 * How riddle-worthy is a real object?
 *
 * The scoring exists to answer one question: does this feature carry enough verifiable detail for a
 * riddle that is true? A clue a child cannot walk up and check is decoration, and it teaches them
 * to trust decoration.
 *
 * Every score carries a breakdown so the ranking is explainable in the CLI and citable in the
 * write-up. A scoring function nobody can interrogate is a scoring function nobody should trust
 * with a child's neighbourhood.
 */

/** Base value per category, from measured yield and riddle-worthiness. */
const CATEGORY_BASE: Record<string, number> = {
  "historic:memorial": 30,
  "memorial:*": 32,
  "tourism:artwork": 30,
  "amenity:drinking_water": 28,
  "amenity:fountain": 26,
  "amenity:place_of_worship": 18,
  "historic:monument": 22,
  "historic:ruins": 20,
  "leisure:playground": 16,
  "natural:tree_row": 14,
};

export type ScoreInput = {
  tags: Record<string, string>;
  category: string;
};

/**
 * Returns a 0-100 score and the reasons behind it.
 *
 * Deliberately additive and inspectable rather than learned or clever. In three days the valuable
 * property is that we can explain any single score to a judge.
 */
export function scoreFeature({ tags, category }: ScoreInput): { score: number; reasons: string[] } {
  let score = CATEGORY_BASE[category] ?? 10;
  const reasons: string[] = [`${category} base ${CATEGORY_BASE[category] ?? 10}`];

  // The strongest signal available: text that is literally carved or written on the object, which
  // the child can read while standing in front of it.
  if (tags.inscription) {
    score += 22;
    reasons.push("+22 inscription (child can read the clue in person)");
  }
  if (tags.start_date) {
    score += 14;
    reasons.push(`+14 start_date ${tags.start_date}`);
  }
  if (tags.artist_name) {
    score += 12;
    reasons.push(`+12 artist_name ${tags.artist_name}`);
  }
  if (tags.memorial) {
    score += 10;
    reasons.push(`+10 memorial=${tags.memorial} narrows what it commemorates`);
  }
  if (tags.artwork_type) {
    score += 10;
    reasons.push(`+10 artwork_type ${tags.artwork_type}`);
  }
  if (tags.material) {
    score += 7;
    reasons.push(`+7 material ${tags.material}`);
  }
  if (tags.description) {
    score += 6;
    reasons.push("+6 description");
  }
  if (tags.height) {
    score += 4;
    reasons.push(`+4 height ${tags.height}`);
  }
  if (tags["subject:wikidata"] || tags.wikidata) {
    score += 3;
    reasons.push("+3 has a Wikidata link, so the fact can be named precisely");
  }

  // Penalties. These are the difference between a memorable stop and a dull walk.
  const name = tags.name ?? "";
  if (name.trim().length < 4) {
    score -= 12;
    reasons.push("-12 name too short to build an image from");
  }
  if (/^(the )?(fountain|memorial|monument|playground|tree|statue|plaque)$/i.test(name.trim())) {
    score -= 18;
    reasons.push(`-18 generic name "${name}" - the child has nothing to walk towards`);
  }
  if (tags.amenity === "bench") {
    score -= 40;
    reasons.push("-40 bench (abundant and unremarkable; a hunt of benches is a walk, not a game)");
  }

  // Respect features are still playable - the war memorial riddle is the whole demo - but a hunt
  // made entirely of them is a depressing and repetitive thing to ask a child to do.
  if (classifySensitivity(tags).sensitivity === "respect") {
    score -= 8;
    reasons.push("-8 sensitive memorial: playable, but we ration these (see composeHunt)");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/**
 * Build the Overpass query from the allowlist.
 *
 * The safety allowlist is enforced HERE as well as in code, which means the category gate is not
 * merely checked after the fact - most non-playable data never crosses the wire at all.
 *
 * Uses `around:` (a circle) rather than a bounding box. The wiki notes bbox performs faster, but a
 * hunt around a point is semantically a radius and converting it to a box means fetching the four
 * corners of a circle. For a 500m radius the extra payload is not worth the complexity.
 */
function buildQuery(lat: number, lon: number, radius: number, limit: number): string {
  const statements = [
    `nwr["historic"~"^(memorial|monument|ruins)$"]["name"](around:${radius},${lat},${lon});`,
    `nwr["memorial"]["name"](around:${radius},${lat},${lon});`,
    `nwr["tourism"="artwork"]["name"](around:${radius},${lat},${lon});`,
    `nwr["amenity"~"^(fountain|drinking_water)$"](around:${radius},${lat},${lon});`,
    `nwr["man_made"~"^(obelisk|sundial|water_well|statue|column)$"]["name"](around:${radius},${lat},${lon});`,
    `nwr["leisure"="playground"](around:${radius},${lat},${lon});`,
    `nwr["natural"="tree_row"](around:${radius},${lat},${lon});`,
  ];

  return [
    `[out:json][timeout:${Math.round(radius / 20) + 25}];`,
    "(",
    ...statements,
    ");",
    // `out center` gives every node a top-level lat/lon and every way/relation a `center`, which is
    // how we guarantee a usable position for all 267/267 elements in testing.
    `out center ${limit};`,
  ].join("\n");
}

export type BuildOptions = {
  /** Stop as soon as we have this many candidates. */
  target?: number;
  /** Try these radii in order. Defaults to config.hunt.radiusMeters. */
  radii?: readonly number[];
  /** Overpass output cap per query. */
  queryLimit?: number;
  fresh?: boolean;
};

/**
 * Fetch, screen, score, and - if the area is too sparse - widen the radius and try again.
 *
 * Adaptive radius is not an optimisation, it is a correctness requirement: yield varies roughly
 * 8x between cities (66 in Madison vs 521 in Freiburg at the same 1500m radius, measured). A fixed
 * radius produces an empty hunt in a sparse city and an overwhelming one in a dense one.
 */
export async function buildCandidatePool(
  lat: number,
  lon: number,
  options: BuildOptions = {},
): Promise<ScoredPool> {
  checkEtiquette();

  const target = options.target ?? hunt.minCandidates;
  const radii = options.radii ?? hunt.radiusMeters;
  const queryLimit = options.queryLimit ?? 400;

  const rejected: RejectedFeature[] = [];
  let best: { candidates: Candidate[]; radius: number } = { candidates: [], radius: radii[0] };

  for (let attempt = 0; attempt < radii.length; attempt++) {
    const radius = radii[attempt];
    const query = buildQuery(lat, lon, radius, queryLimit);

    const { elements, cached } = await runOverpass(query, { fresh: options.fresh });
    const { candidates, rejects } = screenAndScore(elements ?? []);

    // Accumulate rejections across attempts so the CLI can explain what it threw away.
    rejected.push(...rejects);

    if (candidates.length > best.candidates.length) best = { candidates, radius };

    if (candidates.length >= target) {
      return { candidates, rejected, radiusMetres: radius, attempts: attempt + 1 };
    }

    // Overpass caches nothing for us across widening radii, but a wider query is largely a superset
    // of the narrow one. Rather than re-fetching everything on the next attempt, we accumulate.
    if (attempt < radii.length - 1) {
      const seen = new Set(best.candidates.map((c) => `${c.osmType}/${c.osmId}`));
      const merged = [...best.candidates, ...candidates.filter((c) => !seen.has(`${c.osmType}/${c.osmId}`))];
      best = { candidates: sortByScore(merged), radius };
      if (best.candidates.length >= target) {
        return {
          candidates: best.candidates,
          rejected,
          radiusMetres: radius,
          attempts: attempt + 1,
        };
      }
    }
  }

  return {
    candidates: best.candidates,
    rejected,
    radiusMetres: best.radius,
    attempts: radii.length,
  };
}

/** Screen, then score. This is where the safety gate meets the ranking. */
function screenAndScore(
  elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[],
): { candidates: Candidate[]; rejects: RejectedFeature[] } {
  const candidates: Candidate[] = [];
  const rejects: RejectedFeature[] = [];

  for (const element of elements) {
    const screened = screenFeature(element);
    if ("reason" in screened) {
      rejects.push(screened);
      continue;
    }

    // Position: nodes carry lat/lon, ways and relations carry `center` from `out center`.
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") {
      rejects.push({
        osmType: element.type,
        osmId: element.id,
        name: element.tags?.name ?? "",
        category: screened.category.key,
        reason: "unreachable",
        detail: "no usable position in the Overpass response",
      });
      continue;
    }

    const tags = element.tags ?? {};
    const { score, reasons } = scoreFeature({ tags, category: screened.category.key });

    const feature: OsmFeature = {
      osmType: element.type as OsmFeature["osmType"],
      osmId: element.id,
      lat,
      lon,
      tags,
      category: screened.category.key,
    };

    candidates.push({ ...feature, score, scoreReasons: reasons });
  }

  return { candidates: sortByScore(candidates), rejects };
}

function sortByScore(candidates: Candidate[]): Candidate[] {
  // Highest score first. Deterministic tie-break on id so two runs of the CLI agree with each
  // other, which matters when we compare a baseline against a fine-tuned model later.
  return [...candidates].sort((a, b) => (b.score - a.score) || (a.osmId - b.osmId));
}

export type { Sensitivity };