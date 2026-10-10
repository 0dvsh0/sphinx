import type { HuntStop } from "@/lib/riddle";

/**
 * Drafting an OpenStreetMap note.
 *
 * ---------------------------------------------------------------------------
 * THE RULE: A HUMAN SENDS IT. ALWAYS. NO EXCEPTIONS.
 * ---------------------------------------------------------------------------
 * The OSM wiki is explicit, and quoting it is the whole reason this file exists:
 *
 *   "Don't create automated notes. Notes should be a human-to-human communication."
 *
 * and, from the notes developer page:
 *
 *   "this functionality is intended for humans to communicate with other humans (mappers). It is
 *    not a place to dump automated error checking."
 *
 * So Sphinx drafts and a person submits. There is no auto-post path, no queue, no background job,
 * and no "report all the things I could not find". A child taps, reads the exact words, and a grown-up
 * agrees. That is not a limitation we tolerate - it is the correct design, and it happens to be the
 * better pedagogy too (PROJECT_CONTEXT.md section 2.5).
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS THE BEST PART OF THE PROJECT
 * ---------------------------------------------------------------------------
 * Teaching a child that a map is made by people, can be wrong, and that THEY can fix it is worth more
 * than any riddle. The tone therefore has to be a gift, never a complaint: "you found something the
 * map got wrong", not "you failed".
 */

/** Plain-language name of the thing, for a note that has to be useful to a mapper. */
function thingName(stop: HuntStop): string {
  if (stop.name.trim()) return stop.name;
  switch (stop.category) {
    case "amenity:drinking_water":
      return "a drinking fountain";
    case "amenity:fountain":
      return "a fountain";
    case "leisure:playground":
      return "a playground";
    case "natural:tree_row":
      return "a row of trees";
    default:
      return "something marked on the map";
  }
}

export type NoteDraft = {
  text: string;
  lat: number;
  lon: number;
};

/**
 * Build the note.
 *
 * Three requirements, all of which matter:
 *
 * 1. CIVIL. Notes are read by volunteers. "this is wrong lol" gets ignored; a precise, polite
 *    observation gets fixed.
 * 2. USEFUL. A mapper needs enough to act on: what is mapped, and what is actually there.
 * 3. HONEST. We do not claim to know WHY it is gone. A nine-year-old did not survey the site.
 *
 * `withProvenance` adds a line saying where the report came from. This is ON by default: mappers
 * generally prefer knowing how a report was generated, and hiding the tool would be the sort of
 * thing that burns an app's reputation with the community it depends on.
 */
export function draftNote(stop: HuntStop, options: { withProvenance?: boolean } = {}): NoteDraft {
  const withProvenance = options.withProvenance ?? true;
  const thing = thingName(stop);

  const lines = [
    // Opened with the tool's name only when provenance is on. The tone rule is unchanged either
    // way: this reads as an observation made by a person, never as a complaint about a mapper.
    ...(withProvenance ? ["Sphinx walk report:"] : []),
    `The map shows ${thing} at this spot, but it is not here any more.`,
    "",
    "I was looking for it because the map said it existed. It does not, or it has moved, or it has been removed.",
    "",
    "I am not sure when it went, or why. I just wanted to say it is not here now.",
  ];

  if (withProvenance) {
    lines.push(
      "",
      "(Reported from Sphinx, an open-source app that turns OpenStreetMap data into a walking treasure hunt. Sent by hand, with a grown-up.)",
    );
  }

  return {
    text: lines.join("\n"),
    lat: stop.lat,
    lon: stop.lon,
  };
}

/**
 * The child-facing confirmation.
 *
 * Phrased as an achievement on purpose. The line "you found something the map got wrong" is the best
 * sentence in this application, and it must not be buried under a success message.
 */
export const REPORT_GONE_TITLE = "You found something the map got wrong";

export const REPORT_GONE_BODY =
  "The map still has it. You noticed it does not. OpenStreetMap is made by people, and people get " +
  "it wrong sometimes — that is how you fix it.";

/**
 * Categories where "it's gone" is even a sensible report.
 *
 * A child who cannot find a war memorial has probably simply not found it yet, and a note saying so
 * would be noise for the community. Permanently-vanished infrastructure is a different matter, and
 * "fountains no longer exist" is one of the most common and most welcome fixes on OSM.
 */
export const REPORTABLE_CATEGORIES = new Set([
  "amenity:drinking_water",
  "amenity:fountain",
  "amenity:place_of_worship",
  "historic:ruins",
  "leisure:playground",
  "natural:tree_row",
]);

export function canReportGone(stop: HuntStop): boolean {
  return REPORTABLE_CATEGORIES.has(stop.category);
}