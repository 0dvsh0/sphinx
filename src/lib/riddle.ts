/**
 * A single riddle, and the hunt it belongs to.
 *
 * Deliberately minimal for increment 1. The riddle screen is the demo moment and it needs exactly
 * two pieces of text: the riddle, and the fact the child earns by standing in front of the thing.
 *
 * The on-device photo check (increment 4) will need a third field - a literal visual signature
 * derived from the same OSM tags - and it gets added when something actually generates it, not
 * speculatively now.
 */
export type Riddle = {
  id: string;

  /**
   * Two lines maximum. Never names the target - naming it ends the game.
   * Every clue must be checkable against the OSM tags we hold, because a child who cannot walk up
   * and verify it is being taught to trust decoration.
   */
  riddle: string;

  /**
   * The reveal. A true fact about the place the child just stood in.
   *
   * This is the entire reason the app exists and it is deliberately not a score. No confetti, no
   * points, no "correct!". See the design charter, section 3.2.
   */
  fact: string;
};

/**
 * What a photo of this thing should look like.
 *
 * Derived from the same OSM tags as the riddle, so it is grounded by construction. The photo check
 * (increment 4) compares a child's photo against a caption, which is why this lives beside the
 * riddle rather than being generated separately: both come from one set of tags, so they cannot
 * disagree about what the object is.
 *
 * The id must be a key in the closed vocabulary in src/lib/vision/signatures.ts, because that is
 * what the precomputed text-embedding index is keyed by.
 */
export type VisualSignatureId = import("./vision/signatures").VisualSignatureId;

export type Hunt = {
  id: string;
  /** Where this hunt was built. Plain text, because children are the audience. */
  placeName: string;
  riddles: Riddle[];
};

/**
 * The on-disk shape of a built hunt.
 *
 * Shared by the CLI (scripts/hunt.ts), the generation API route, and the IndexedDB store, so all
 * three agree on one format. `clues` survives into the saved hunt on purpose: increment 6 measures
 * groundedness from it, and it is the only record of which OSM tag produced which line.
 */
export type HuntStop = {
  id: string;
  riddle: string;
  fact: string;
  /** Every claim, traced to the OSM tag it came from. */
  clues: { text: string; source: string }[];
  /**
   * What a photo of this should look like, or null when the tags support no confident caption.
   *
   * null is an honest outcome and the photo check turns it into "I can't tell" rather than
   * guessing - see src/lib/vision/types.ts.
   */
  visual: { id: VisualSignatureId; text: string } | null;
  category: string;
  sensitivity: "playful" | "respect";
  lat: number;
  lon: number;
  name: string;
  osmUrl: string;
  /** Which template frame produced the riddle. "template-fallback" until increment 6. */
  frameId: string;
  /** Riddle-worthiness, 0-100. Kept on the stop so the grown-up review can explain the order. */
  score: number;
};

export type HuntArtifact = {
  id: string;
  placeName: string;
  centre: { lat: number; lon: number };
  radiusMetres: number;
  generatedAt: string;
  /** "template-fallback" today; becomes the Tinker model path in increment 6. */
  generator: string;
  stops: HuntStop[];
};

/**
 * A hunt plus the player's progress through it.
 *
 * Progress is stored beside the hunt rather than in a separate key, so one record holds the whole
 * state of a session and there is no way to end up with a hunt and a progress pointer disagreeing.
 */
export type SavedHunt = HuntArtifact & {
  /** Index of the stop the player is currently on. */
  currentStop: number;
  /** Set when the last stop is revealed. */
  finishedAt?: string;
};