import {
  allowedCategories,
  excludedTags,
  nameOptionalCategories,
  type AllowedCategory,
} from "@/lib/config";
import type { OsmFeature, RejectedFeature } from "./types";

/**
 * CONTENT SAFETY GATE. See PROJECT_CONTEXT.md section 2.4.
 *
 * The rule this file exists to enforce: Sphinx must never turn a child's neighbourhood into a
 * treasure hunt built on someone's grave.
 *
 * OSM faithfully records the entire human record. It contains execution sites, graves, memorials to
 * specific dead people, memorials to the war dead, to victims of atrocities, to suicides. A
 * generator that turns any of those into a jokey hunt is a serious harm, and it would end the
 * project's credibility with exactly the community whose data we depend on.
 *
 * Three gates, in this order, and crucially ALL of them run BEFORE anything is written:
 *
 *   1. Category allowlist - is this kind of thing playable at all? Queries are also built from this
 *      list, so most of this is enforced upstream in Overpass as well.
 *   2. Tag exclusions - private land, and the documented OSM tagging mistakes that would otherwise
 *      match our memorial queries.
 *   3. Sensitivity classification - a playable category can still be a grave. We do not exclude
 *      these, because the war memorial riddle is the whole demo. We mark them `respect`, which
 *      changes how they are written and caps how many appear.
 *
 * Note what is NOT here: no string-matching of riddle text. The charter asks for a gate at
 * generation, not a filter afterwards, and a filter afterwards would still let a model write
 * something cruel and then quietly discard it. Better to never ask for it.
 */

/** How sensitive this feature is. Drives riddle voice and hunt composition. */
export type Sensitivity = "playful" | "respect";

/**
 * Words that mark a memorial as being about a specific, sensitive death rather than a public
 * commemoration.
 *
 * This is NOT a filter - matching words do not cause exclusion. It downgrades the feature to
 * `respect` and suppresses the inscription from the generator's input, so a model cannot build a
 * joke out of someone's death. The distinction matters: "died in the war" is commemorated publicly
 * and is the best riddle material we have; "executed here" is not.
 */
const SENSITIVE_TERMS = [
  "executed",
  "execution",
  "hanged",
  "guillotined",
  "beheaded",
  "suicide",
  "took her own life",
  "took his own life",
  "murdered",
  "massacre",
  "died in custody",
  "died in prison",
  "grave",
  "buried",
  "tomb",
  "gravesite",
  "child soldiers",
  "holocaust",
  "genocide",
];

/**
 * Memorial subtypes that are grief, not commemoration.
 *
 * This is the distinction that matters and it is per-feature, not per-category. OSM's
 * `historic=memorial` covers both a cenotaph listing the war dead and a small blue plate on a
 * terraced house saying a famous singer lived here. Classifying the whole category as sensitive
 * threw away the richest material in the dataset - in Bristol that silently dropped every blue
 * plaque, on the grounds that a singer's house is a grave.
 *
 * So: the subtypes below are about who died. Plaques, busts and statues are about someone who
 * lived, which is a much better thing to send a child towards.
 */
const RESPECT_MEMORIAL_SUBTYPES = new Set([
  "war_memorial",
  "cenotaph",
  "stolperstein",
  "grave",
  "tomb",
  "mass_grave",
  "memorial_plaque_war",
]);

const RESPECT_CATEGORIES = new Set(
  allowedCategories.filter((c) => c.sensitive === "respect").map((c) => c.key),
);

/**
 * Reserved for a category that is sensitive in its entirety. Currently empty by design: respect is
 * decided per-feature from the memorial subtype and from the descriptive text, because
 * `historic=memorial` covers both a cenotaph and a singer's house. Kept so that a genuinely
 * grief-only category can be declared in config.ts without touching this logic.
 */

export function findCategory(tags: Record<string, string>): AllowedCategory | null {
  // Order matters: check specific keys before wildcards, otherwise memorial=* shadows
  // historic:memorial and the more specific label is lost.
  for (const category of allowedCategories) {
    if (category.key.endsWith(":*")) {
      const key = category.key.slice(0, -2);
      if (tags[key]) return category;
    } else {
      const [key, value] = category.key.split(":");
      if (tags[key] === value) return category;
    }
  }
  return null;
}

/**
 * Is this feature about a specific sensitive death, or a playable category that happens to be
 * commemorative?
 *
 * Looks only at descriptive text, never at the name, because a name is often just a person's name
 * and matching on it would exclude most memorials - including the ones worth playing.
 */
export function classifySensitivity(tags: Record<string, string>): { sensitivity: Sensitivity; trigger?: string } {
  const category = findCategory(tags);

  // Three independent routes to `respect`, any one of which is enough.
  const griefSubtype = Boolean(tags.memorial && RESPECT_MEMORIAL_SUBTYPES.has(tags.memorial));
  const respectByCategory = category ? RESPECT_CATEGORIES.has(category.key) : false;

  const haystack = `${tags.description ?? ""} ${tags.inscription ?? ""} ${tags["artwork_subject"] ?? ""}`.toLowerCase();
  const trigger = SENSITIVE_TERMS.find((term) => haystack.includes(term));

  if (griefSubtype || respectByCategory || trigger) return { sensitivity: "respect", ...(trigger ? { trigger } : {}) };
  return { sensitivity: "playful" };
}

/**
 * The gate. Returns null if the feature may be played, or a rejection with the reason.
 *
 * `unreachable` is not a content judgement - it means the child could not legally walk to it, which
 * would make for a bad afternoon behind a fence rather than a safety issue per se.
 */
export function screenFeature(
  element: { type: string; id: number; tags?: Record<string, string> },
): { category: AllowedCategory; sensitivity: Sensitivity } | RejectedFeature {
  const tags = element.tags ?? {};
  const name = tags.name ?? "";

  const reject = (reason: RejectedFeature["reason"], detail: string): RejectedFeature => ({
    osmType: element.type,
    osmId: element.id,
    name,
    category: null,
    reason,
    detail,
  });

  // 1. Category allowlist.
  const category = findCategory(tags);
  if (!category) {
    return reject("not_in_allowlist", "no allowlisted category matched these tags");
  }

  // 2. Tag exclusions. Some of these are documented OSM tagging mistakes, which is why they are
  //    worth an explicit list rather than a generic "is this valid" check.
  for (const [key, value] of Object.entries(tags)) {
    const normalised = `${key}:${value}`;
    if (excludedTags[normalised]) {
      if (value === "private" || value === "no") {
        return reject("unreachable", `${normalised} - not reachable on foot by the public`);
      }
      return reject("junk_tag", `${normalised} - documented OSM tagging mistake`);
    }
  }

  // Unnamed features normally have no riddle material and nothing for the child to walk towards.
  // The exceptions are categories that ARE their own riddle - above all a drinking fountain, which
  // needs no proper noun and is the entire premise of the "it's gone" twist.
  if (!name.trim() && !nameOptionalCategories.includes(category.key as never)) {
    return reject("unnamed", "no name - nothing for the riddle to be about");
  }

  const { sensitivity } = classifySensitivity(tags);
  return { category, sensitivity };
}

/**
 * Text handed to a riddle generator.
 *
 * The inscription is the single best source of riddle material in the whole dataset, and it is also
 * the highest-risk text: it can contain a name of a dead person, or their final words. For `respect`
 * features we therefore do not pass the raw inscription at all - the generator gets structure only
 * and writes about the physical object.
 *
 * This is the point where "never show a model something that could make a cruel riddle" happens.
 */
export function generatorInput(feature: OsmFeature, sensitivity: Sensitivity): Record<string, string> {
  const { tags } = feature;
  const safe: Record<string, string> = {
    category: feature.category,
    name: tags.name ?? "",
  };

  if (tags.material) safe.material = tags.material;
  if (tags.start_date) safe.start_date = tags.start_date;
  if (tags.height) safe.height = tags.height;
  if (tags.memorial) safe.memorial = tags.memorial;
  if (tags.artwork_type) safe.artwork_type = tags.artwork_type;
  if (tags.artist_name) safe.artist_name = tags.artist_name;
  if (tags["building:material"]) safe.building_material = tags["building:material"];
  if (tags.religion) safe.religion = tags.religion;
  if (tags.denomination) safe.denomination = tags.denomination;

  // Suppressed for respect features. See the doc comment above.
  if (sensitivity === "playful") {
    if (tags.inscription) safe.inscription = tags.inscription;
    if (tags.description) safe.description = tags.description;
    if (tags["artwork_subject"]) safe.artwork_subject = tags["artwork_subject"];
  }

  return safe;
}