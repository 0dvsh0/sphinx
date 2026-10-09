/**
 * The closed vocabulary of things a child's photo can be.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A CLOSED SET
 * ---------------------------------------------------------------------------
 * Zero-shot image-text matching normally needs BOTH halves of a CLIP-style model: a vision tower to
 * encode the photo, and a text tower to encode whatever phrase you want to compare it against.
 *
 * CLIP ViT-B/32 costs 85MB for the vision half and 61MB for the text half - 146MB on a child's
 * phone. That is not shippable, and it is not acceptable for this audience.
 *
 * But our vocabulary is CLOSED. Every visual signature this app ever asks about is derived from an
 * OSM category, so there are about two dozen of them and we know all of them in advance. That means
 * the text embeddings can be computed once, at build time, on a machine that can afford the 61MB
 * text tower - and the phone only ever downloads the vision tower.
 *
 * That is the whole trick: 11MB instead of 146MB. See scripts/build-visual-index.ts.
 *
 * Adding a category here means adding it to the vocabulary, which means re-running the build
 * script. That is a feature: the vocabulary is meant to be small and reviewable.
 */

export type VisualSignatureId =
  | "stone-plaque-on-wall"
  | "blue-plaque-on-wall"
  | "carved-stone-slab"
  | "bronze-figure"
  | "stone-figure"
  | "brick-building"
  | "stone-building"
  | "stone-fountain-basin"
  | "metal-drinking-fountain"
  | "playground-equipment"
  | "rubber-playground-surface"
  | "row-of-trees"
  | "stone-ruin-wall"
  | "tall-monument-column"
  | "wreath-and-names"
  | "wooden-bench"
  | "painted-mural-on-wall"
  | "metal-railing"
  | "stone-arch"
  | "tile-roof-building";

export type VisualSignature = {
  id: VisualSignatureId;
  /** A short literal caption, as a photo captioner would describe it. */
  text: string;
};

/**
 * The vocabulary.
 *
 * Phrasing note: these read as image captions, NOT as riddle lines. A captioner describes what is
 * visible; that is exactly the register the photo check needs, and mixing it with riddle voice would
 * make the comparison worse.
 */
export const SIGNATURES: VisualSignature[] = [
  { id: "stone-plaque-on-wall", text: "a small weathered stone plaque mounted flat on a brick wall" },
  { id: "blue-plaque-on-wall", text: "a small blue enamel plaque fixed to a brick wall" },
  { id: "carved-stone-slab", text: "an upright carved stone slab with letters cut into it" },
  { id: "bronze-figure", text: "a green patinated bronze statue of a person" },
  { id: "stone-figure", text: "a pale stone statue of a person" },
  { id: "brick-building", text: "an old red brick church or chapel building" },
  { id: "stone-building", text: "an old stone church or chapel building" },
  { id: "stone-fountain-basin", text: "a weathered stone fountain basin with water" },
  { id: "metal-drinking-fountain", text: "a metal drinking fountain with a small basin" },
  { id: "playground-equipment", text: "a playground with a slide and climbing frame" },
  { id: "rubber-playground-surface", text: "a playground with a bright rubber safety surface" },
  { id: "row-of-trees", text: "a straight row of trees planted along a street" },
  { id: "stone-ruin-wall", text: "a crumbling stone wall with no roof" },
  { id: "tall-monument-column", text: "a tall stone monument or column standing in the open" },
  { id: "wreath-and-names", text: "a war memorial with carved names and a wreath" },
  { id: "wooden-bench", text: "a wooden park bench" },
  { id: "painted-mural-on-wall", text: "a colourful painted mural on a concrete wall" },
  { id: "metal-railing", text: "a decorative metal railing" },
  { id: "stone-arch", text: "a stone arch or gateway" },
  { id: "tile-roof-building", text: "a building with a tiled sloping roof" },
];

/** Guard against drift between the vocabulary and the precomputed index. */
export const SIGNATURE_IDS = new Set(SIGNATURES.map((s) => s.id));

/**
 * Pick the signature for a feature, from its tags.
 *
 * Returns null when nothing matches. A null signature means the photo check has nothing to compare
 * against, and the correct behaviour is to say "I can't tell" - never to guess, and never to fall
 * back to a generic "building" that would match almost any street.
 */
export function signatureFor(tags: Record<string, string>, category: string): VisualSignatureId | null {
  const material = (tags.material ?? "").toLowerCase();
  const hasBluePlaque = tags.memorial === "blue_plaque" || tags.plaque?.startsWith("here_");
  const isFigure = ["statue", "sculpture", "bust", "statuary"].includes(tags.memorial ?? "") ||
    ["statue", "sculpture", "bust", "mosaic", "mural"].includes(tags.artwork_type ?? "");

  // Blue plaques are checked first: they are also historic=memorial, and the colour is the single
  // most useful thing in a photo of one.
  if (hasBluePlaque) return "blue-plaque-on-wall";

  if (tags.memorial === "war_memorial" || tags.memorial === "cenotaph" || tags.memorial === "stolperstein") {
    return "wreath-and-names";
  }

  if (category === "amenity:drinking_water") return "metal-drinking-fountain";
  if (category === "amenity:fountain") return "stone-fountain-basin";

  if (category === "natural:tree_row") return "row-of-trees";
  if (category === "historic:ruins") return "stone-ruin-wall";
  if (category === "leisure:playground") {
    return tags.surface === "rubber" ? "rubber-playground-surface" : "playground-equipment";
  }
  if (category === "historic:monument") {
    return tags.height && Number.parseFloat(tags.height) > 8 ? "tall-monument-column" : "tall-monument-column";
  }

  if (isFigure) {
    if (material.includes("bronze") || material.includes("brass") || material.includes("copper")) {
      return "bronze-figure";
    }
    return "stone-figure";
  }

  if (tags.inscription || tags.memorial === "plaque" || tags.plaque) {
    return material.includes("stone") || material.includes("marble") ? "carved-stone-slab" : "stone-plaque-on-wall";
  }

  if (category === "amenity:place_of_worship") {
    return material.includes("brick") ? "brick-building" : "stone-building";
  }

  if (tags.artwork_type === "mural") return "painted-mural-on-wall";

  return null;
}