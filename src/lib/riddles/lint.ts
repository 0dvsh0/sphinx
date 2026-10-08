/**
 * Riddle text lint.
 *
 * Treats generated text as untrusted, because it will be - by a template today, by a fine-tuned
 * model in increment 6. This module is the single gate both must pass, so the safety property does
 * not silently disappear when the generator gets swapped.
 *
 * Two classes of problem, from PROJECT_CONTEXT.md section 2.2 and the design charter:
 *
 * 1. WAYFINDING. A riddle that tells a child to cross a road, follow a path or turn left has
 *    turned a word game into a traffic hazard. Riddles describe a PLACE, never a ROUTE.
 *
 * 2. SPOILING. A riddle that names the target ends the game. Also: a riddle that leaks a coordinate
 *    or a distance turns a walk into a waypoint hunt, which is the opposite of the point.
 *
 * Deliberate non-goal: this does not judge whether a riddle is a good riddle, or whether it is
 * cruel. Cruelty is prevented upstream in the safety gate (src/lib/osm/safety.ts) by never asking a
 * generator for material that invites it. A lint that tried to catch cruelty after the fact would
 * be both unreliable and too late.
 */

export type LintKind = "riddle" | "fact";

export type Violation = {
  code:
    | "wayfinding"
    | "names_target"
    | "leaks_coordinate"
    | "leaks_distance"
    | "too_short"
    | "too_long"
    | "empty"
    | "gives_away"
    | "spoils_with_name";
  message: string;
};

export type LintResult = {
  ok: boolean;
  violations: Violation[];
};

// ---------------------------------------------------------------------------
// 1. Wayfinding
// ---------------------------------------------------------------------------

/**
 * Patterns that describe movement rather than a place.
 *
 * Written to be precise rather than broad. "Look closer" is a legitimate invitation to observe and
 * must NOT match; "walk down the lane" must. A blunt verb list would reject good riddles and train
 * us to ignore the lint, which is worse than not having one.
 */
const WAYFINDING_PATTERNS: { re: RegExp; example: string }[] = [
  { re: /\bcross(?:ing)?\s+(?:the\s+|a\s+)?(?:road|street|river|bridge|rail|rails|track|lines|highway|motorway)\b/i, example: "cross the road" },
  { re: /\bfollow\s+(?:the\s+|a\s+)?(?:path|road|street|trail|river|track|route|lane|footpath|way)\b/i, example: "follow the path" },
  { re: /\bturn\s+(?:left|right|around|back)\b/i, example: "turn left" },
  { re: /\b(?:walk|go|head|continue|stroll|head)\s+(?:down|up|along|towards?|across|past|until|onward)/i, example: "walk towards the trees" },
  { re: /\btake\s+(?:the\s+|a\s+)?(?:path|road|route|left|right|exit|turn)\b/i, example: "take the path" },
  { re: /\b(?:on|to)\s+the\s+(?:other|far)\s+side\b/i, example: "on the other side" },
  { re: /\bopposite\s+the\b/i, example: "opposite the church" },
  { re: /\b(?:just\s+)?(?:past|before|after)\s+the\s+(?:junction|roundabout|crossroads|traffic\s+lights?|bus\s+stop|bridge)\b/i, example: "just past the junction" },
  { re: /\b(?:north|south|east|west)(?:wards?)?\s+(?:of|from|along|towards?)\b/i, example: "north of the square" },
  { re: /\bon\s+the\s+(?:north|south|east|west)\s+(?:side|corner|edge)\s+of\b/i, example: "on the north side of" },
  { re: /\b(?:where|wherever)\s+(?:the|you)\b.*\b(?:enters?|exits?)\b/i, example: "where the lane enters the square" },
  { re: /\b(?:enter|exit)\s+(?:the|into)\b/i, example: "enter the churchyard" },
];

/**
 * A number plus a distance or duration is wayfinding by stealth.
 *
 * "It is 200 m from the square" tells a child where to go. "I am 3 m tall" does not: it describes
 * the thing in front of them, which is the entire job of a riddle.
 *
 * These fire on the number; {@link isObjectDimension} vetoes the ones that measure the object rather
 * than the route. The veto matters in practice - `height` is one of the most common tags on the
 * monuments, statues and fountains Sphinx hunts, so without it the lint would reject the riddles for
 * exactly the objects the app is best at, and the run would fall back to flatter wording.
 */
const DISTANCE_PATTERNS: RegExp[] = [
  /\b\d+\s*(?:m\b|meters?\b|metres?\b|km\b)/i,
  /\b\d+\s*(?:minutes?\b|mins?\b|hours?)\b/i,
  /\ba\s+few\s+(?:minutes?|metres?|meters?)\b/i,
];

/** Words that make a following measurement a property of the object, not of the walk to it. */
const DIMENSION_WORDS =
  /\b(?:tall|taller|tallest|high|higher|long|longer|wide|wider|narrower|narrowest|deep|deeper|diameter|radius|thick|thicker|across|around\s+the\s+base|in\s+total)\b/i;

/**
 * True when the match at `index` measures the object rather than a route to it.
 *
 * FORWARD LOOKING ONLY, and deliberately so. An earlier version also vetoed on a subject before the
 * number ("I am 3 m", "About 500 m") and the safety suite caught it immediately: that admits
 * "I am 200 m from the square where the buses stop" and "About 500 m of pavement separates me from
 * the road", which are exactly the route disclosures this rule exists to stop. There is no reliable
 * way to tell "I am 3 m" from "I am 200 m from the square" without reading what follows, so the veto
 * requires an explicit dimension word and nothing else.
 *
 * "I am 3 m" with no dimension word is therefore rejected. That is the correct default: an
 * under-rejected riddle could put a child in a road, an over-rejected one merely gets plainer.
 */
function isObjectDimension(text: string, index: number): boolean {
  return DIMENSION_WORDS.test(text.slice(index, index + 32));
}

const COORDINATE_PATTERNS: RegExp[] = [
  /\b-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/, // 51.4545, -2.5879
  /\b\d{1,3}\s*(?:deg|degrees?)\s*\d{1,2}\s*(?:min|minutes)\b/i,
];

// ---------------------------------------------------------------------------
// 2. Spoiling
// ---------------------------------------------------------------------------

/** Phrases that announce success instead of describing a place. */
const GIVEAWAY_PATTERNS: RegExp[] = [
  /\byou(?:'ve| have)\s+found\b/i,
  /\bthis\s+is\s+(?:the|a|an|your)\b/i,
  /\bcongratulations\b/i,
  /\byou\s+are\s+standing\b/i,
  /\bhere\s+it\s+is\b/i,
];

/**
 * Words that are too generic to count as naming the target.
 *
 * Without this, a feature named "Chestnut Tree Row" would make the word "tree" a spoiler, and the
 * lint would start rejecting perfectly good riddles. What gives the game away is the DISTINCTIVE
 * part of the name, not the category.
 */
const GENERIC_WORDS = new Set([
  // categories
  "memorial", "monument", "statue", "fountain", "plaque", "cross", "obelisk", "statuary",
  "sculpture", "playground", "church", "chapel", "cathedral", "shrine", "ruins", "walls",
  "gate", "garden", "gardens", "park", "tree", "trees", "wood", "fountain", "water", "drinking",
  "bandstand", "bridge", "tower", "hall", "house", "museum", "library", "school", "castle",
  "well", "column", "steps", "seat", "benches", "railings", "fountain",
  // materials and descriptors
  "stone", "iron", "steel", "wooden", "wood", "brick", "marble", "bronze", "granite", "concrete",
  "metal", "glass", "limestone", "sandstone", "slate", "copper", "brass", "cast",
  "small", "little", "big", "large", "old", "new", "upper", "lower", "great", "little", "north",
  "south", "east", "west", "the", "and", "of", "at", "in", "on",
]);

const STOPWORDS = new Set(["the", "a", "an", "and", "of", "at", "in", "on", "to", "for", "der", "die", "das"]);

/**
 * Trailing category words that OSM appends to names as a naming convention, not as identity.
 *
 * English Heritage plaques are consistently named "Irene Rose blue plaque", "Mabel Tribe blue
 * plaque". "blue plaque" is the category - the child can see that from across the street - and the
 * identity is the person's name. Without stripping these, the lint rejects every blue plaque riddle
 * that honestly mentions its colour, which is most of them.
 *
 * Stripped from the end only, and only as a whole trailing phrase, so a memorial genuinely called
 * "Stone Cross Memorial" keeps "stone" and "cross" as distinctive.
 */
const NAME_SUFFIXES = [
  "blue plaque",
  "open plaque",
  "commemorative plaque",
  "plaque",
  "memorial",
  "monument",
  "statue",
  "sculpture",
  "fountain",
  "war memorial",
];

function stripCategorySuffix(name: string): string {
  let result = normalise(name);
  for (const suffix of NAME_SUFFIXES) {
    const ending = ` ${suffix}`;
    if (result.endsWith(ending) && result.length > ending.length + 1) {
      result = result.slice(0, -ending.length).trim();
    }
  }
  return result;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019'"`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The distinctive parts of a name - the tokens that would actually give the riddle away.
 *
 * Returns [] when the name carries nothing distinctive, in which case the name check is skipped
 * rather than guessed at.
 */
function distinctiveTokens(name: string): string[] {
  const tokens = stripCategorySuffix(name).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const distinctive = tokens.filter(
    (token) => token.length >= 4 && !GENERIC_WORDS.has(token) && !STOPWORDS.has(token),
  );

  // A name made entirely of generic words ("Stone Memorial") has no distinctive part. Use the whole
  // normalised name as a single token so we still catch the exact phrase.
  return distinctive.length > 0 ? distinctive : [normalise(name)].filter(Boolean);
}

/**
 * Whole-word containment.
 *
 * Substring matching produced false positives that would have quietly disabled the whole lint: the
 * name "Some Factory blue plaque" matched the riddle word "someone" because "someone" contains
 * "some". A checker that cries wolf on ordinary words gets ignored, and an ignored wayfinding
 * checker is worse than none, because it looks like protection.
 */
function containsPhrase(haystack: string, phrase: string): boolean {
  if (!phrase) return false;
  const haystackWords = haystack.split(" ").filter(Boolean);
  const phraseWords = phrase.split(" ").filter(Boolean);
  if (phraseWords.length === 0) return false;
  if (phraseWords.length > haystackWords.length) return false;

  outer: for (let i = 0; i <= haystackWords.length - phraseWords.length; i++) {
    for (let j = 0; j < phraseWords.length; j++) {
      if (haystackWords[i + j] !== phraseWords[j]) continue outer;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The lint
// ---------------------------------------------------------------------------

export type LintInput = {
  text: string;
  kind?: LintKind;
  /** The target's OSM name, if known. Enables the spoiler check. */
  name?: string;
  maxWords?: number;
};

/** House style: two lines, one image, one turn. 30 words is already generous for that. */
const DEFAULT_MAX_WORDS = 30;

export function lintRiddle({ text, kind = "riddle", name, maxWords = DEFAULT_MAX_WORDS }: LintInput): LintResult {
  const violations: Violation[] = [];
  const trimmed = (text ?? "").trim();
  const normalised = normalise(trimmed);
  const words = normalised ? normalised.split(" ") : [];

  if (!trimmed) {
    return { ok: false, violations: [{ code: "empty", message: "No text." }] };
  }

  // Length limits apply to riddles only. A fact is allowed to be "A fountain." - two words, and
  // entirely sufficient. Checking facts for length rejected perfectly good reveals.
  if (kind === "riddle") {
    if (words.length < 4) {
      violations.push({ code: "too_short", message: `Only ${words.length} words - too little to walk towards.` });
    }
    if (words.length > maxWords) {
      violations.push({
        code: "too_long",
        message: `${words.length} words, limit is ${maxWords}. Children read these at arm's length while walking.`,
      });
    }
  }

  // 1. Wayfinding - applies to both riddles and facts.
  for (const { re, example } of WAYFINDING_PATTERNS) {
    if (re.test(trimmed)) {
      violations.push({
        code: "wayfinding",
        message: `Contains movement guidance (e.g. "${example}"). A riddle describes a place, never a route - a child following this could end up in a road.`,
      });
      break; // one wayfinding violation is enough to fail it
    }
  }

  for (const re of COORDINATE_PATTERNS) {
    if (re.test(trimmed)) {
      violations.push({
        code: "leaks_coordinate",
        message: "Contains a coordinate. That turns a walk into a waypoint hunt.",
      });
      break;
    }
  }

  // 2. Spoiling - riddle only. A fact is the reveal, so naming things is the point of it.
  if (kind === "riddle") {
    for (const re of DISTANCE_PATTERNS) {
      const match = re.exec(trimmed);
      // A measurement of the object ("I am 3 m tall") describes the thing, not the walk to it.
      if (match && !isObjectDimension(trimmed, match.index)) {
        violations.push({
          code: "leaks_distance",
          message: "Contains a distance or duration, which is wayfinding by stealth.",
        });
        break;
      }
    }

    for (const re of GIVEAWAY_PATTERNS) {
      if (re.test(trimmed)) {
        violations.push({ code: "gives_away", message: "Announces the answer instead of describing the place." });
        break;
      }
    }

    if (name) {
      const nameNorm = normalise(name);
      // The full name appearing is always a spoiler.
      if (nameNorm.length >= 4 && containsPhrase(normalised, nameNorm)) {
        violations.push({ code: "spoils_with_name", message: `Contains the target's name ("${name}").` });
      } else {
        // Otherwise, check the distinctive parts only, ignoring any trailing category suffix.
        for (const token of distinctiveTokens(name)) {
          if (containsPhrase(normalised, token)) {
            violations.push({
              code: "names_target",
              message: `Contains "${token}" from the target's name ("${name}"), which gives it away.`,
            });
            break;
          }
        }
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Repair or reject.
 *
 * For templates, a repairable violation should be fixed rather than dropped - but only for the
 * mechanical ones. We never try to "fix" a wayfinding violation by rewriting it, because a rewrite
 * we did not plan is a rewrite we did not check. Reject instead and let the caller pick another
 * candidate.
 */
export function repairOrReject(result: LintResult): { repaired: string | null } | { error: LintResult } {
  if (result.ok) return { repaired: null };
  return { error: result };
}