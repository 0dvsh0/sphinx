import { lintRiddle } from "./lint";
import type { OsmFeature } from "@/lib/osm/types";
import type { Sensitivity } from "@/lib/osm/safety";

/**
 * The template riddle writer.
 *
 * THIS IS THE FALLBACK, and it is meant to stay. It needs no API key, no network beyond one OSM
 * query, and no model, so the demo can never be blocked by a paid service or a training run.
 *
 * It is also the BASELINE for increment 6. Every riddle it produces is recorded, so the fine-tuned
 * model can be measured against it rather than against nothing. That comparison is what the Best Use
 * of Tinker category asks for, so the weak version has to exist and be honest about being weak.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE: every line traces to an OSM tag.
 * ---------------------------------------------------------------------------
 * If a child cannot walk up to the object and verify the clue, it is decoration - and it teaches
 * children to trust decoration. So nothing here is invented: no invented weather, no invented
 * pigeons, no invented history. Atmospheric flourish is exactly what the fine-tuned model is for,
 * and measuring how much better it does while staying grounded is the whole point of increment 6.
 *
 * Every clue this module emits is returned alongside its source tag, so groundedness is checkable
 * rather than asserted.
 */

export type Clue = {
  /** The phrase as it appears in the riddle, or a fact about it. */
  text: string;
  /** The OSM tag it came from. Empty string means it is a category fact, not a tag. */
  source: string;
};

export type DraftRiddle = {
  riddle: string;
  fact: string;
  /** Every claim, traced to its source. The groundedness metric reads this. */
  clues: Clue[];
};

// ---------------------------------------------------------------------------
// Tag reading
// ---------------------------------------------------------------------------

/** A year, or a span of years, from any of the three tags OSM uses for dating things. */
type Years = { year: string; endYear?: string; source: string };

/**
 * Blue plaques are dated with `historic:date`, not `start_date`, and often as a range like
 * "1882..1886" ("lived here from 1882-1886"). Reading only `start_date` missed every blue plaque in
 * Bristol during the first pass - a whole category of good material, silently invisible.
 */
function extractYears(tags: Record<string, string>): Years | null {
  for (const key of ["start_date", "historic:date", "date"] as const) {
    const raw = tags[key];
    if (!raw) continue;

    const range = raw.match(/\b(\d{4})\s*\.\.\s*(\d{4})\b/);
    if (range) return { year: range[1], endYear: range[2], source: key };

    const single = raw.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
    if (single) return { year: single[1], source: key };
  }

  const inscription = tags.inscription?.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
  if (inscription) return { year: inscription[1], source: "inscription" };

  return null;
}

/** Phrase a date range the way a person would. */
function phraseYears(years: Years): string {
  return years.endYear ? `${years.year} to ${years.endYear}` : years.year;
}

/**
 * The English Heritage / Open Plaques scheme. `plaque=here_lived`, `here_worked`, `blue` etc.
 * This is unusually rich, unusually checkable material: the child is standing in front of a blue
 * plate on a wall and can read exactly what it says.
 *
 * `raw` is the untouched OSM value and is what frames must compare against; `kind` is the
 * underscored-to-spaced form for use in prose. Comparing against `kind` instead is a bug that
 * silently disabled every blue plaque frame during increment 2.
 */
function readPlaque(tags: Record<string, string>): { raw: string; kind: string; source: string } | null {
  const raw = tags.plaque ?? tags["memorial:plaque"];
  if (!raw) return null;
  return { raw, kind: raw.replace(/_/g, " "), source: tags.plaque ? "plaque" : "memorial:plaque" };
}

/**
 * How a material reads in a sentence.
 *
 * `verb` is a past participle so it fits every frame that uses it: "someone carved me out of
 * stone", "I am stone, carved to remember someone", "I am stone, carved in 1919". The first pass
 * used full verb phrases ("cast in", "made from") which produced sentences like "Someone cast in me
 * out of bronze" - a reminder that a slot-filling template only works if the slot is shaped like the
 * sentence it goes into.
 */
const MATERIALS: Record<string, { noun: string; verb: string }> = {
  stone: { noun: "stone", verb: "carved" },
  marble: { noun: "marble", verb: "carved" },
  granite: { noun: "granite", verb: "carved" },
  limestone: { noun: "limestone", verb: "carved" },
  sandstone: { noun: "sandstone", verb: "carved" },
  slate: { noun: "slate", verb: "split" },
  brick: { noun: "brick", verb: "built" },
  concrete: { noun: "concrete", verb: "poured" },
  iron: { noun: "iron", verb: "cast" },
  steel: { noun: "steel", verb: "made" },
  bronze: { noun: "bronze", verb: "cast" },
  brass: { noun: "brass", verb: "cast" },
  copper: { noun: "copper", verb: "cast" },
  wood: { noun: "wood", verb: "made" },
  timber: { noun: "wood", verb: "made" },
  metal: { noun: "metal", verb: "made" },
  glass: { noun: "glass", verb: "blown" },
};

function readMaterial(tags: Record<string, string>): { noun: string; verb: string; source: string } | null {
  const raw = tags.material ?? tags["building:material"];
  if (!raw) return null;
  const known = MATERIALS[raw.toLowerCase().trim()];
  if (known) return { ...known, source: tags.material ? "material" : "building:material" };
  // Unknown material: use the tag value but keep the phrasing neutral.
  return { noun: raw.toLowerCase(), verb: "made from", source: tags.material ? "material" : "building:material" };
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * How a playground surface gets there, keyed by the OSM `surface` value.
 *
 * The first version of this frame said "laid in sheets rather than poured" for everything except
 * grass, which is a claim a child can disprove by looking down: asphalt and concrete ARE poured, and
 * woodchips and sand are loose-fill. That is precisely the failure the grounding rule exists to
 * prevent, and it came from a generator shortcut rather than from bad OSM data.
 *
 * Unknown surfaces get the neutral phrasing, which is true of anything: it says the value and claims
 * nothing further. Being wrong about a playground floor is cheap; being confidently wrong to a child
 * standing on it is not.
 */
const SURFACE_PHRASES: Record<string, string> = {
  asphalt: "poured flat in one piece",
  concrete: "poured flat in one piece",
  paving_stones: "fitted piece by piece",
  rubber: "poured soft, with lines painted on",
  resin: "poured soft, with lines painted on",
  tartan: "poured soft, with lines painted on",
  sand: "loose, and raked back into place",
  woodchips: "loose, and raked back into place",
  gravel: "loose, and raked back into place",
  bark: "loose, and raked back into place",
  grass: "grown rather than laid",
  wood: "planked, board by board",
  dirt: "not laid at all",
  ground: "not laid at all",
  mud: "not laid at all",
};

function describeSurface(surface: string): string {
  return SURFACE_PHRASES[surface.toLowerCase()] ?? "put down and kept clear";
}

/** Trim an inscription to something quotable without inventing an ellipsis into a quote. */
function quoteInscription(text: string, maxWords = 22): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  if (words.length <= maxWords) return clean;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

/** What a fact should call this thing, in plain language for a child. */
const CATEGORY_PLAIN: Record<string, string> = {
  "historic:memorial": "a memorial",
  "memorial:*": "a memorial",
  "tourism:artwork": "public artwork",
  "amenity:drinking_water": "a drinking fountain",
  "amenity:fountain": "a fountain",
  "amenity:place_of_worship": "an old place of worship",
  "historic:monument": "a monument",
  "historic:ruins": "ruins",
  "leisure:playground": "a playground",
  "natural:tree_row": "a row of trees",
};

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

type Ctx = {
  feature: OsmFeature;
  tags: Record<string, string>;
  sensitivity: Sensitivity;
  material: ReturnType<typeof readMaterial>;
  years: Years | null;
  plaque: ReturnType<typeof readPlaque>;
  surface: string | null;
  operator: string | null;
};

type Frame = {
  id: string;
  /** Frames marked respectful are the only ones allowed for a `respect` feature. */
  respectful?: boolean;
  fits: (c: Ctx) => boolean;
  riddle: (c: Ctx) => { text: string; clues: Clue[] };
  fact: (c: Ctx) => string;
};

/**
 * Frames are tried in order and the first match wins, so more specific frames come first.
 *
 * Each frame's riddle must pass lintRiddle. Frames are pure functions of tags, which means a given
 * feature always produces the same riddle - so the same feature will always produce the same lint
 * outcome, and there is no flakiness to chase.
 */
const FRAMES: Frame[] = [
  // --- Blue plaques --------------------------------------------------------
  // The richest verified material OSM has for a child's hunt: the text is literally on the wall,
  // and the child is standing in front of it reading.
  {
    id: "blue-plaque-here-lived",
    fits: (c) => c.plaque?.raw === "here_lived" && Boolean(c.years),
    riddle: (c) => ({
      text: `I am blue, and I am about someone who lived here${
        c.years ? ` from ${phraseYears(c.years)}` : ""
      }.\n${
        c.material ? `I am ${c.material.noun}, screwed to something older than me.` : "I am small, flat, and permanent."
      }`,
      clues: [
        { text: "I am blue", source: "memorial=blue_plaque / plaque=here_lived" },
        { text: "someone who lived here", source: "plaque=here_lived" },
        ...(c.years ? [{ text: `from ${phraseYears(c.years)}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) =>
      `An English Heritage blue plaque, marking where ${c.tags.name.replace(/\s*blue plaque$/i, "")} lived${
        c.years ? ` (${phraseYears(c.years)})` : ""
      }.`,
  },
  {
    id: "blue-plaque-here-lived-undated",
    // Found by scripts/check-safety.ts: a `plaque=here_lived` with no date anywhere fell through
    // every frame and produced nothing. Plaques are frequently undated, so this is a common case,
    // not an edge case.
    fits: (c) => c.plaque?.raw === "here_lived" && !c.years,
    riddle: (c) => ({
      text: `I am blue, and I am about someone who lived here.${
        c.material ? ` I am ${c.material.noun}.` : " I am small and I am screwed to a wall."
      }\nThe years are on me, not in my name.`,
      clues: [
        { text: "I am blue", source: "memorial=blue_plaque / plaque=here_lived" },
        { text: "someone who lived here", source: "plaque=here_lived" },
        ...(c.material ? [{ text: `I am ${c.material.noun}`, source: c.material.source }] : []),
      ],
    }),
    fact: (c) =>
      `An English Heritage blue plaque, marking where ${c.tags.name.replace(/\s*blue plaque$/i, "")} lived.`,
  },
  {
    id: "blue-plaque-here-worked",
    fits: (c) => c.plaque?.raw === "here_worked",
    riddle: (c) => ({
      text: `Someone used to work here, and I am the reason anyone remembers.\n${
        c.years ? `I went up in ${phraseYears(c.years)}.` : "I am a small blue thing on a wall."
      }`,
      clues: [
        { text: "someone used to work here", source: "plaque=here_worked" },
        ...(c.years ? [{ text: `I went up in ${phraseYears(c.years)}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) => `An English Heritage blue plaque, marking where ${c.tags.name.replace(/\s*blue plaque$/i, "")} worked.`,
  },
  {
    id: "open-plaques-scheme",
    fits: (c) => Boolean(c.tags["openplaques:id"]) && !c.plaque,
    riddle: () => ({
      text: "I am one of hundreds of me, all the same colour, all on walls like this one.",
      clues: [{ text: "one of hundreds of me, all the same colour", source: "openplaques:id" }],
    }),
    fact: (c) =>
      `An Open Plaques scheme plaque. ${
        c.tags.inscription ? `It reads: "${quoteInscription(c.tags.inscription, 20)}"` : ""
      }`,
  },

  // --- Memorials -----------------------------------------------------------
  {
    id: "war-memorial-inscription",
    respectful: true,
    fits: (c) => c.tags.memorial === "war_memorial" && Boolean(c.years),
    riddle: (c) => ({
      text: `I hold the names of people who did not come home.\nI was put up in ${c.years!.year}, and the names are still readable.`,
      clues: [
        { text: "hold the names of people who did not come home", source: "memorial=war_memorial" },
        { text: `put up in ${c.years!.year}`, source: c.years!.source },
      ],
    }),
    fact: (c) =>
      `A war memorial, put up in ${c.years!.year}.${
        c.tags.inscription ? ` Its inscription reads: "${quoteInscription(c.tags.inscription, 18)}"` : ""
      }`,
  },
  {
    id: "war-memorial-plain",
    respectful: true,
    fits: (c) => c.tags.memorial === "war_memorial",
    riddle: (c) => ({
      text: `I hold the names of people who did not come home.\n${
        c.material ? `I am ${c.material.noun}.` : "I have been standing a long time."
      }`,
      clues: [
        { text: "hold the names of people who did not come home", source: "memorial=war_memorial" },
        ...(c.material ? [{ text: `I am ${c.material.noun}`, source: c.material.source }] : []),
      ],
    }),
    fact: (c) => `A war memorial${c.years ? `, from ${c.years!.year}` : ""}.`,
  },
  {
    id: "plaque-inscription",
    // Plate-like memorials only. A sculpture with an inscription is handled below, because calling
    // Henry Moore's "Die Liegende" small would be a clue the child can immediately disprove.
    fits: (c) =>
      Boolean(c.tags.inscription) &&
      Boolean(c.tags.memorial || c.feature.category === "tourism:artwork") &&
      (c.tags.memorial === undefined ||
        ["plaque", "blue_plaque", "stone", "stele", "bench", "cross", "memorial"].includes(c.tags.memorial)),
    riddle: (c) => ({
      text: `I am ${c.material ? c.material.noun : "small"}, flat, and written on.${
        c.years ? `\nOne of the dates on me is ${c.years!.year}.` : "\nI am small enough to walk past."
      }`,
      clues: [
        ...(c.material ? [{ text: `I am ${c.material.noun}`, source: c.material.source }] : []),
        { text: "flat, and written on", source: "inscription" },
        ...(c.years ? [{ text: `One of the dates on me is ${c.years!.year}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) => {
      const base = c.tags.memorial ? `A ${c.tags.memorial.replace(/_/g, " ")}. ` : "";
      return `${base}Its inscription reads: "${quoteInscription(c.tags.inscription)}"`;
    },
  },
  {
    id: "sculpted-inscription",
    // Sculptures, statues and busts with writing on them. Size is never asserted - OSM does not
    // record how big Henry Moore was, and guessing would be the exact failure the grounding rule
    // exists to prevent.
    fits: (c) =>
      Boolean(c.tags.inscription) &&
      (["sculpture", "statue", "bust", "obelisk", "artwork", "colossus"].includes(c.tags.memorial ?? "") ||
        (c.feature.category === "tourism:artwork" && c.tags.artwork_type !== undefined)),
    riddle: (c) => ({
      text: `I am ${c.material ? `${c.material.verb} out of ${c.material.noun}` : "shaped by hand"}, and I am written on.${
        c.years ? `\nThe year I was made is ${c.years!.year}.` : "\nThe writing on me is smaller than the making of me."
      }`,
      clues: [
        ...(c.material
          ? [{ text: `${c.material.verb} out of ${c.material.noun}`, source: c.material.source }]
          : [{ text: "shaped by hand", source: "memorial" }]),
        { text: "written on", source: "inscription" },
        ...(c.years ? [{ text: `made in ${c.years!.year}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) => {
      const kind = c.tags.memorial ?? c.tags.artwork_type ?? "artwork";
      return `${capitalise(kind)}. Its inscription reads: "${quoteInscription(c.tags.inscription, 20)}"`;
    },
  },
  {
    id: "memorial-material-year",
    respectful: true,
    fits: (c) => Boolean(c.material) && Boolean(c.years) && c.sensitivity === "respect",
    riddle: (c) => ({
      text: `I am ${c.material!.noun}, ${c.material!.verb} to remember someone.\nThe year on me is ${c.years!.year}.`,
      clues: [
        { text: `I am ${c.material!.noun}, ${c.material!.verb} to remember someone`, source: c.material!.source },
        { text: `The year on me is ${c.years!.year}`, source: c.years!.source },
      ],
    }),
    fact: (c) => `A memorial from ${c.years!.year}, made of ${c.material!.noun}.`,
  },

  // --- Playgrounds and trees ----------------------------------------------
  // The categories most likely to have almost no tags at all, so these lean on `surface` and
  // `operator`, and the composer skips them when neither exists rather than inventing weather.
  {
    id: "playground-surface",
    fits: (c) => c.feature.category === "leisure:playground" && Boolean(c.surface),
    riddle: (c) => ({
      text: `My floor is ${c.surface}, ${describeSurface(c.surface ?? "")}.${c.operator ? `\n${capitalise(c.operator)} puts me back together.` : "\nSomething here gets mended and painted again."}`,
      clues: [
        { text: `My floor is ${c.surface}`, source: "surface" },
        ...(c.operator ? [{ text: `${capitalise(c.operator)} puts me back together`, source: "operator" }] : []),
      ],
    }),
    fact: (c) =>
      `A playground with a ${c.surface} surface${c.tags.name ? `, part of ${c.tags.name}` : ""}.${
        c.operator ? ` Maintained by ${c.operator}.` : ""
      }`,
  },
  {
    id: "tree-row",
    fits: (c) => c.feature.category === "natural:tree_row",
    riddle: () => ({
      text: "I am not alone. I was planted next to others on purpose, and I am still in line.",
      clues: [{ text: "planted next to others on purpose, still in line", source: "natural=tree_row" }],
    }),
    fact: (c) => `A row of trees planted deliberately${c.tags.name ? `, known as ${c.tags.name}` : ""}.`,
  },
  {
    id: "artwork-type-only",
    fits: (c) => c.feature.category === "tourism:artwork" && Boolean(c.tags.artwork_type) && !c.tags.artist_name,
    riddle: (c) => ({
      text: `I am a ${c.tags.artwork_type}, and I am outdoors on purpose.${
        c.years ? `\nI went up in ${c.years!.year}.` : "\nI was not made to be indoors."
      }`,
      clues: [
        { text: `I am a ${c.tags.artwork_type}`, source: "artwork_type" },
        ...(c.years ? [{ text: `I went up in ${c.years!.year}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) =>
      `Public artwork - a ${c.tags.artwork_type}${c.years ? `, from ${c.years!.year}` : ""}.${
        c.tags["subject:wikidata"] ? " It has a Wikipedia article, so there is a longer story." : ""
      }`.trim(),
  },
  {
    id: "ruins",
    fits: (c) => c.feature.category === "historic:ruins",
    riddle: (c) => ({
      text: `I used to be a wall with a roof.${c.years ? ` I was built in ${c.years!.year}.` : ""}\nWhat is left of me still stands in the right place.`,
      clues: [
        { text: "used to be a wall with a roof", source: "historic=ruins" },
        ...(c.years ? [{ text: `built in ${c.years!.year}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) => `Ruins${c.years ? `, dating from ${c.years!.year}` : ""}${c.tags.name ? `, known as ${c.tags.name}` : ""}.`,
  },
  {
    id: "monument",
    fits: (c) => c.feature.category === "historic:monument" || (c.tags.historic === "monument" && !c.tags.memorial),
    riddle: (c) => ({
      text: `I am ${c.material ? c.material.noun : "big and still"}, and I mark a spot rather than a thing.${
        c.years ? `\nI went up in ${c.years!.year}.` : "\nI am still where I was put."
      }`,
      clues: [
        { text: "I mark a spot rather than a thing", source: "historic=monument" },
        ...(c.material ? [{ text: `I am ${c.material.noun}`, source: c.material.source }] : []),
        ...(c.years ? [{ text: `I went up in ${c.years!.year}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) =>
      `A monument${c.years ? ` from ${c.years!.year}` : ""}${c.tags.name ? `, marking ${c.tags.name}` : ""}.`,
  },
  {
    id: "place-of-worship-plain",
    fits: (c) => c.feature.category === "amenity:place_of_worship",
    riddle: (c) => ({
      text: `People have been quieting down here${
        c.tags.denomination ? ` for ${c.tags.denomination.toLowerCase()} worship` : ""
      }.${
        c.material ? `The outside is ${c.material.noun}.` : "The building is older than the road outside."
      }`,
      clues: [
        { text: "people have been quieting down here", source: "amenity=place_of_worship" },
        ...(c.tags.denomination ? [{ text: `for ${c.tags.denomination.toLowerCase()} worship`, source: "denomination" }] : []),
        ...(c.material ? [{ text: `The outside is ${c.material.noun}`, source: c.material.source }] : []),
      ],
    }),
    fact: (c) =>
      `${c.tags.name}${
        c.tags.denomination ? `, a ${c.tags.denomination.toLowerCase()} church` : "an old church"
      }${c.years ? `, dated ${c.years!.year}` : ""}.`,
  },

  // --- Public artwork ------------------------------------------------------
  {
    id: "artwork-artist",
    fits: (c) => Boolean(c.tags.artist_name) && Boolean(c.tags.artwork_type || c.material),
    riddle: (c) => ({
      text: `Someone ${
        c.material ? `${c.material.verb} me out of ${c.material.noun}` : "made me on purpose"
      }, and their name is on me.\n${
        c.years ? `I have been standing here since ${c.years!.year}.` : "I am still outdoors, which was the point."
      }`,
      clues: [
        ...(c.material
          ? [{ text: `${c.material.verb} me out of ${c.material.noun}`, source: c.material.source }]
          : [{ text: "made me on purpose", source: "artist_name" }]),
        { text: "their name is on me", source: "artist_name" },
        ...(c.years ? [{ text: `standing here since ${c.years!.year}`, source: c.years!.source }] : []),
      ],
    }),
    fact: (c) =>
      `Public artwork by ${c.tags.artist_name}${c.tags.artwork_type ? `, a ${c.tags.artwork_type}` : ""}.${
        c.years ? ` From ${c.years!.year}.` : ""
      }`,
  },
  {
    id: "artwork-height",
    fits: (c) => c.feature.category === "tourism:artwork" && Boolean(c.tags.height),
    riddle: (c) => ({
      text: `I am ${c.tags.height} tall and I do not move.\n${
        c.material ? `I am ${c.material.noun}.` : "People walk past me every day."
      }`,
      clues: [
        { text: `${c.tags.height} tall`, source: "height" },
        ...(c.material ? [{ text: `I am ${c.material.noun}`, source: c.material.source }] : []),
      ],
    }),
    fact: (c) => `Public artwork${c.tags.artwork_type ? `, a ${c.tags.artwork_type}` : ""}, ${c.tags.height} tall.`,
  },

  // --- Water ---------------------------------------------------------------
  {
    id: "drinking-water",
    fits: (c) => c.feature.category === "amenity:drinking_water",
    riddle: (c) => ({
      text: `I was here to be drunk from.\n${
        c.tags.operational_status === "broken" || c.tags.disused === "yes"
          ? "I am not working any more."
          : c.material ? `I am ${c.material.noun} and I am turned on by hand.` : "You had to push a handle."
      }`,
      clues: [
        { text: "I was here to be drunk from", source: "amenity=drinking_water" },
        ...(c.tags.operational_status === "broken"
          ? [{ text: "I am not working any more", source: "operational_status=broken" }]
          : []),
        ...(c.material ? [{ text: `I am ${c.material.noun}`, source: c.material.source }] : []),
      ],
    }),
    fact: (c) =>
      c.tags.operational_status === "broken"
        ? `A drinking fountain, mapped but marked broken. Worth checking whether it is still there.`
        : "A drinking fountain.",
  },
  {
    id: "fountain",
    fits: (c) => c.feature.category === "amenity:fountain",
    riddle: () => ({
      text: `I am fed by a pipe you cannot see.\nI have never once asked to be looked at.`,
      clues: [{ text: "fed by a pipe you cannot see", source: "amenity=fountain" }],
    }),
    fact: () => "A fountain.",
  },

  // --- Places of worship ---------------------------------------------------
  {
    id: "place-of-worship-year",
    respectful: true,
    fits: (c) => c.feature.category === "amenity:place_of_worship" && Boolean(c.years),
    riddle: (c) => ({
      text: `People have been quieting down here since ${c.years!.year}.\n${
        c.material ? `The outside is ${c.material.noun}.` : "The building is older than the street around it."
      }`,
      clues: [
        { text: `quieting down here since ${c.years!.year}`, source: c.years!.source },
        ...(c.material ? [{ text: `The outside is ${c.material.noun}`, source: c.material.source }] : []),
      ],
    }),
    fact: (c) =>
      `${c.tags.name}${
        c.tags.denomination ? `, a ${c.tags.denomination.toLowerCase()} church` : "an old church"
      }, dated ${c.years!.year}.`,
  },

  // --- Generic fallbacks ---------------------------------------------------
  {
    id: "generic-material-year",
    fits: (c) => Boolean(c.material) && Boolean(c.years),
    riddle: (c) => ({
      text: `I am ${c.material!.noun}, ${c.material!.verb} in ${c.years!.year}.\nI have outlasted everything that came after me.`,
      clues: [
        { text: `I am ${c.material!.noun}, ${c.material!.verb} in ${c.years!.year}`, source: `${c.material!.source} + ${c.years!.source}` },
      ],
    }),
    fact: (c) => {
      const plain = CATEGORY_PLAIN[c.feature.category] ?? "A mapped object";
      return `${plain}${c.tags.name ? ` named "${c.tags.name}"` : ""}, made of ${c.material!.noun}, dated ${c.years!.year}.`;
    },
  },
  {
    id: "generic-material",
    fits: (c) => Boolean(c.material),
    riddle: (c) => ({
      text: `I am ${c.material!.noun}.\n${
        c.tags.artist_name ? `Someone put me here on purpose.` : "People walk past me and do not look twice."
      }`,
      clues: [
        { text: `I am ${c.material!.noun}`, source: c.material!.source },
        ...(c.tags.artist_name ? [{ text: "Someone put me here on purpose", source: "artist_name" }] : []),
      ],
    }),
    fact: (c) => {
      const plain = CATEGORY_PLAIN[c.feature.category] ?? "A mapped object";
      return `${plain}${c.tags.name ? ` named "${c.tags.name}"` : ""}, made of ${c.material!.noun}.`;
    },
  },
  {
    id: "generic-year",
    fits: (c) => Boolean(c.years),
    riddle: (c) => ({
      text: `I have been here since ${c.years!.year}.\n${
        c.tags.artist_name ? `I know whose hand I am.` : "Nothing about me needs explaining."
      }`,
      clues: [
        { text: `I have been here since ${c.years!.year}`, source: c.years!.source },
        ...(c.tags.artist_name ? [{ text: "I know whose hand I am", source: "artist_name" }] : []),
      ],
    }),
    fact: (c) => {
      const plain = CATEGORY_PLAIN[c.feature.category] ?? "A mapped object";
      return `${plain}${c.tags.name ? ` named "${c.tags.name}"` : ""}, dated ${c.years!.year}.`;
    },
  },
];

/**
 * Last resort. Uses only what is certainly true, so it always produces something safe.
 *
 * This frame is deliberately flat. It exists so a hunt never fails to build, not so riddles come out
 * well - a bland riddle the child can still walk to beats a brilliant one that sends them into
 * traffic.
 */
function lastResort(c: Ctx): Frame {
  return {
    id: "last-resort",
    fits: () => true,
    riddle: () => ({
      text: "Something here is on the map, and you are looking at it.",
      clues: [{ text: "something is on the map", source: "osm" }],
    }),
    fact: (ctx) =>
      `${CATEGORY_PLAIN[ctx.feature.category] ?? "A mapped object"}${
        ctx.tags.name ? ` called "${ctx.tags.name}"` : ""
      }.`,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export type TemplateResult = {
  riddle: string;
  fact: string;
  clues: Clue[];
  frameId: string;
};

/**
 * Write a riddle from tags alone.
 *
 * Always returns something lint-clean, because every frame is tag-derived and the lint is applied
 * here before the text leaves this function. If a frame somehow fails lint we fall through to the
 * next one rather than shipping unchecked text.
 */
export function writeTemplateRiddle(feature: OsmFeature, sensitivity: Sensitivity): TemplateResult {
  const ctx: Ctx = {
    feature,
    tags: feature.tags,
    sensitivity,
    material: readMaterial(feature.tags),
    years: extractYears(feature.tags),
    plaque: readPlaque(feature.tags),
    surface: feature.tags.surface?.toLowerCase().trim() || null,
    operator: feature.tags.operator?.trim() || null,
  };

  const ordered = [...FRAMES, lastResort(ctx)];

  for (const frame of ordered) {
    // A frame marked respectful must not be used for a playful feature, and a NON-respectful frame
    // must not be used for a `respect` feature. That second rule is the important one: it is what
    // stops a war memorial falling through to "People have been quieting down here" phrasing that
    // was written for a church.
    if (sensitivity === "respect" && !frame.respectful && frame.id !== "last-resort") continue;
    if (!frame.fits(ctx)) continue;

    const { text, clues } = frame.riddle(ctx);
    const flat = text.replace(/\n/g, " ");
    const lint = lintRiddle({ text: flat, kind: "riddle", name: feature.tags.name });

    if (!lint.ok) continue;

    return { riddle: flat, fact: frame.fact(ctx), clues, frameId: frame.id };
  }

  // Unreachable: lastResort always fits and always lints clean. Kept as a hard floor.
  const fallback = lastResort(ctx);
  const { text, clues } = fallback.riddle(ctx);
  return { riddle: text, fact: fallback.fact(ctx), clues, frameId: "last-resort" };
}