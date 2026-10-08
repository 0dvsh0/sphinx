import type { AllowedCategory } from "@/lib/config";

/**
 * A feature as we actually want it: normalised, located, categorised.
 *
 * The `lat`/`lon` are guaranteed present. Overpass `out center;` gives nodes a top-level
 * lat/lon and gives ways and relations a `center`, so this is the only place that difference
 * needs handling (verified against 267 mixed results, 0 missing).
 */
export type OsmFeature = {
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  /** Matches an entry in `allowedCategories`, e.g. "historic:memorial". */
  category: string;
};

/** Why a feature was rejected, so the CLI can explain itself and the write-up can cite it. */
export type RejectionReason =
  | "not_in_allowlist"
  | "private_access"
  | "junk_tag"
  | "unnamed"
  | "sensitive_content"
  | "unreachable";

export type RejectedFeature = {
  osmType: string;
  osmId: number;
  name: string;
  category: string | null;
  reason: RejectionReason;
  detail: string;
};

export type Candidate = OsmFeature & {
  /** 0-100. Higher is more riddle-worthy. */
  score: number;
  /** Human-readable breakdown, so the ranking is explainable rather than magic. */
  scoreReasons: string[];
};

export type ScoredPool = {
  candidates: Candidate[];
  rejected: RejectedFeature[];
  radiusMetres: number;
  /** Radius attempts made before stopping. More than one means we had to widen. */
  attempts: number;
};

/** An Overpass result row, as returned by `out center`. */
export type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
};

export type OverpassResponse = {
  version?: number;
  generator?: string;
  elements?: OverpassElement[];
  remark?: string;
};

export type Place = {
  name: string;
  lat: number;
  lon: number;
  osmType?: string;
  osmId?: number;
};