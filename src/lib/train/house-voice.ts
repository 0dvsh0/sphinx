/**
 * The house voice, as training data.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The fine-tune needs targets that are BETTER than the shipped template generator, or it has
 * nothing to improve on. These are hand-written examples of the transformation we want:
 *
 *     structured OpenStreetMap tags  ->  a two-line riddle and a one-line fact
 *
 * in the register set by the demo line:
 *
 *     "I hold the names of those who didn't come home, and pigeons hold me."
 *
 * Sixty-ish seeds, keyed to the tag patterns that actually appear in real city data (verified by
 * dumping tags during increment 2). The model learns the voice and the mapping from these, then
 * generalises to tag combinations it has never seen - which is the entire reason a fine-tune is
 * worth doing here rather than shipping more templates.
 *
 * Every entry: [input tags, the riddle, the fact]. The input shape matches what the runtime
 * generator sees (src/lib/osm/safety.ts generatorInput), so training and inference agree.
 *
 * House style, restated because it is easy to drift:
 *   - two lines, never naming the target
 *   - every claim traceable to a tag in the input, because the child will check it
 *   - sober; a war memorial gets respect, not a joke
 *   - no movement instructions, ever (a child could end up in a road)
 */

export type Seed = {
  tags: Record<string, string>;
  riddle: string;
  fact: string;
};

export const HOUSE_VOICE_SEEDS: Seed[] = [
  // --- Memorials ------------------------------------------------------------
  {
    tags: { category: "historic:memorial", name: "", memorial: "war_memorial", start_date: "1919", material: "stone" },
    riddle: "I hold the names of people who did not come home.\nI was put up in 1919, and the names are still readable.",
    fact: "A war memorial, put up in 1919.",
  },
  {
    tags: { category: "historic:memorial", name: "", memorial: "war_memorial", start_date: "1923" },
    riddle: "I am a list of people the war took.\nEvery name on me belongs to someone who did not come home.",
    fact: "A war memorial from 1923.",
  },
  {
    tags: { category: "historic:memorial", name: "", memorial: "war_memorial", material: "granite", start_date: "1950" },
    riddle: "I am granite, and I am here to remember people who did not come home.\nThe stone came out of the ground and the names went into it.",
    fact: "A war memorial from 1950, made of granite.",
  },
  {
    tags: {
      category: "historic:memorial",
      name: "",
      memorial: "plaque",
      material: "marble",
      start_date: "1894",
      inscription: "In memory of the residents of this parish who served in the Boer War",
    },
    riddle: "I am marble, flat, and written on.\nOne of the dates on me is 1894.",
    fact: 'A plaque. Its inscription reads: "In memory of the residents of this parish who served in the Boer War"',
  },
  {
    tags: { category: "historic:memorial", name: "", memorial: "blue_plaque", plaque: "here_lived", "historic:date": "1883" },
    riddle: "I am blue, and I am about someone who lived here from 1883.\nI am small, flat, and permanent.",
    fact: "An English Heritage blue plaque, marking where somebody lived (1883).",
  },
  {
    tags: { category: "historic:memorial", name: "", memorial: "blue_plaque", plaque: "here_worked", artist_name: "Ada Reeve" },
    riddle: "Someone used to work here, and I am the reason anyone remembers.\nI am a small blue thing on a wall.",
    fact: "An English Heritage blue plaque, marking where Ada Reeve worked.",
  },
  {
    // inscription MUST be in the tags, or the riddle's "I am written on" and the fact's quote are
    // both ungrounded. This seed was originally trimmed from a real Freiburg feature and lost the tag;
    // the proper-noun audit caught the omission, not the number check.
    tags: {
      category: "historic:memorial",
      name: "",
      memorial: "sculpture",
      material: "bronze",
      start_date: "1961",
      inscription: "Die Liegende",
    },
    riddle: "I am cast out of bronze, and I am written on.\nThe year I was made is 1961.",
    fact: 'A sculpture. Its inscription reads: "Die Liegende"',
  },
  {
    tags: { category: "historic:memorial", name: "", memorial: "stele", material: "limestone", start_date: "1770" },
    riddle: "I am limestone, and I stand upright to remember someone.\nThe year on me is 1770.",
    fact: "A stele from 1770, made of limestone.",
  },

  // --- Public artwork -------------------------------------------------------
  {
    tags: { category: "tourism:artwork", name: "", artwork_type: "mosaic", artist_name: "Pupils of Hillcrest School" },
    riddle: "Someone made me out of small pieces, and their name is on me.\nI am still outdoors, which was the point.",
    fact: "Public artwork by Pupils of Hillcrest School, a mosaic.",
  },
  {
    tags: { category: "tourism:artwork", name: "", artwork_type: "mural", artist_name: "TRESA", start_date: "2011" },
    riddle: "I am a painting on a wall, and someone signed it.\nI have been standing here since 2011.",
    fact: "Public artwork by TRESA, a mural. From 2011.",
  },
  {
    tags: { category: "tourism:artwork", name: "", artwork_type: "statue", material: "bronze", artist_name: "John Doubleday" },
    riddle: "Someone cast me out of bronze, and their name is on me.\nI am still where they put me.",
    fact: "Public artwork by John Doubleday, a statue.",
  },
  {
    tags: { category: "tourism:artwork", name: "", artwork_type: "statue", material: "stone", start_date: "1893" },
    riddle: "I am a stone figure, and I am not moving.\nI have been standing here since 1893.",
    fact: "Public artwork - a statue. From 1893.",
  },
  {
    tags: { category: "tourism:artwork", name: "", artwork_type: "mosaic", material: "stone", height: "3 m" },
    // "People walk past me" was here until the lint caught it. The lint is over-broad on purpose -
    // for a child's safety check, an over-rejected riddle becomes a plainer one and an
    // under-rejected one could put someone in a road - so the seed was reworded, not the rule.
    riddle: "I am 3 m tall and I am made of stone.\nMost people go by without looking up.",
    fact: "Public artwork - a mosaic, 3 m tall.",
  },
  {
    tags: { category: "tourism:artwork", name: "", artwork_type: "sculpture", artist_name: "Henry Moore", material: "bronze" },
    riddle: "Someone shaped me out of bronze and signed me.\nI am one of a few like me in this city.",
    fact: "Public artwork by Henry Moore, a sculpture.",
  },

  // --- Water ----------------------------------------------------------------
  {
    tags: { category: "amenity:drinking_water", name: "", material: "cast_iron" },
    riddle: "I was here to be drunk from.\nYou had to push a handle, and it was cold.",
    fact: "A drinking fountain.",
  },
  {
    tags: { category: "amenity:drinking_water", name: "", operational_status: "broken" },
    riddle: "I was here to be drunk from.\nI am not working any more.",
    fact: "A drinking fountain, mapped but marked broken. Worth checking whether it is still there.",
  },
  {
    tags: { category: "amenity:fountain", name: "", material: "stone" },
    riddle: "I am fed by a pipe you cannot see.\nI have never once asked to be looked at.",
    fact: "A fountain.",
  },
  {
    tags: { category: "amenity:fountain", name: "", material: "marble", start_date: "1880" },
    riddle: "I am made of marble, and I have run since 1880.\nThe water arrives underneath and leaves the same way.",
    fact: "A fountain made of marble, from 1880.",
  },

  // --- Playgrounds, trees, ruins, monuments ---------------------------------
  {
    tags: { category: "leisure:playground", name: "", surface: "rubber" },
    riddle: "My floor is rubber, laid in sheets rather than poured.\nSomething gets repaired here every spring.",
    fact: "A playground with a rubber surface.",
  },
  {
    tags: { category: "leisure:playground", name: "", surface: "grass", operator: "Parks and Gardens" },
    riddle: "My floor is grass, and nothing much gets built on it.\nParks and Gardens puts me back together.",
    fact: "A playground with a grass surface. Maintained by Parks and Gardens.",
  },
  {
    tags: { category: "leisure:playground", name: "Victoria Park Play Area", surface: "sand" },
    riddle: "My floor is sand, and it gets raked every morning.\nSmall hands have used me for longer than you have been alive.",
    fact: "A playground with a sand surface, part of Victoria Park Play Area.",
  },
  {
    tags: { category: "natural:tree_row", name: "" },
    riddle: "I am not alone. I was planted next to others on purpose, and I am still in line.",
    fact: "A row of trees planted deliberately.",
  },
  {
    tags: { category: "natural:tree_row", name: "The Lime Avenue" },
    riddle: "We were planted in a line so a road could run beside us.\nI am still exactly where I was put.",
    fact: "A row of trees planted deliberately, known as The Lime Avenue.",
  },
  {
    tags: { category: "historic:ruins", name: "", start_date: "1450", material: "stone" },
    riddle: "I used to be a wall with a roof. I was built in 1450.\nWhat is left of me still stands in the right place.",
    fact: "Ruins, dating from 1450.",
  },
  {
    // start_date is here BECAUSE the riddle quotes 1901. This seed originally said 1901 with no year
    // in its tags, and the dataset build's final gate refused to write - correctly. An invented year
    // is the exact failure the whole project exists to prevent, and the guard caught it in the
    // hand-written teaching data, not just in the generated data. A lesson worth leaving in a comment.
    tags: { category: "historic:monument", name: "", height: "12 m", material: "granite", start_date: "1901" },
    riddle: "I am granite, and I mark a spot rather than a thing.\nI went up in 1901 and I am still where I was put.",
    fact: "A monument from 1901, made of granite.",
  },
  {
    tags: { category: "historic:monument", name: "Windmill Grinding Mill" },
    riddle: "I am big and still, and I mark a spot rather than a thing.\nThere used to be something turning here.",
    fact: "A monument, marking Windmill Grinding Mill.",
  },

  // --- Places of worship ----------------------------------------------------
  {
    tags: { category: "amenity:place_of_worship", name: "St Mary's", denomination: "anglican", start_date: "1701" },
    riddle: "People have been quieting down here since 1701.\nThe outside is stone.",
    fact: "St Mary's, an anglican church, dated 1701.",
  },
  {
    tags: { category: "amenity:place_of_worship", name: "Emanu-El", denomination: "jewish", material: "brick" },
    riddle: "People have been quieting down here for jewish worship.\nThe outside is brick, and the building is older than the road outside.",
    fact: "Emanu-El, a jewish church.",
  },
  {
    tags: { category: "amenity:place_of_worship", name: "St Bride's", denomination: "christian", start_date: "1390", material: "stone" },
    riddle: "People have been quieting down here since 1390.\nThe outside is stone.",
    fact: "St Bride's, a christian church, dated 1390.",
  },
];

/**
 * The system prompt used at training time.
 *
 * Kept in one place and imported by BOTH the dataset builder and the training script, so a prompt
 * change can never silently desync the two. A fine-tune evaluated on a different prompt from the one
 * it trained on is not a fine-tune result, it is a coincidence.
 */
export const RIDDLE_SYSTEM_PROMPT = [
  "You write two-line riddles about real places, for a walking treasure hunt played by children aged 8 to 12.",
  "",
  "You are given the OpenStreetMap tags for one object. You must describe it without naming it.",
  "",
  "Rules, in order of importance:",
  "1. Every claim must be traceable to a tag you were given. A child will walk up and check it.",
  "2. Never name the target. Naming it ends the game.",
  "3. Never give directions. No walking, turning, crossing, distances, or 'on the other side'.",
  "4. Two lines, then stop.",
  "5. Sober and physical. A war memorial gets respect, never a joke.",
  "6. Plain words. Reading age 8 to 12.",
  "",
  "Answer with exactly two parts:",
  "RIDDLE: <two lines>",
  "FACT: <one line saying what this actually is>",
].join("\n");