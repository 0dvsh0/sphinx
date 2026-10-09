import type { VisualSignatureId } from "./signatures";

/**
 * The photo check's contract.
 *
 * Three states, never a bare score.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO "WRONG" SCORE
 * ---------------------------------------------------------------------------
 * A CLIP-style cosine similarity between a child's phone photo and a short caption is a PLAUSIBILITY
 * check, not proof of identity. It cannot tell Henry Moore's "Die Liegende" from any other bronze
 * figure, and it will happily score a photo of the pavement higher than a dim photo of the real
 * thing.
 *
 * That means a naive threshold produces the worst possible outcome for this audience: a child who
 * photographs exactly the right thing, badly, is told they are wrong. Most children would stop
 * playing at that point, and they would be right to.
 *
 * So the middle state is not an error path. "I can't tell - try again, or ask the grown-up" is a
 * FIRST-CLASS outcome with its own icon, its own copy, and no sense of failure.
 *
 * This honesty is also the write-up's best defence of the feature: overclaiming a similarity score
 * as verification would be both untrue and worse for the child than admitting what it is.
 */

export type Verdict = "correct" | "unsure" | "not-it";

export type VerifyResult = {
  verdict: Verdict;

  /** Raw cosine similarity, 0-1. Shown to the grown-up panel, never to the child. */
  score: number;

  /** The signature we compared against, when we had one. */
  signatureId: VisualSignatureId | null;

  /** Which backend produced this. Shown to the grown-up panel. */
  backend: BackendKind;

  /**
   * How much to trust this verdict, given how it was produced.
   *
   * `weak` means the backend is a heuristic, not a model, and the verdict should be treated as
   * almost no information at all. We surface it rather than pretending.
   */
  confidence: "model" | "weak" | "none";

  /** One line the child can act on. Never mentions a score. */
  message: string;

  /** Present when the check could not run. Never fatal - there is always something to fall back to. */
  notice?: string;
};

export type BackendKind =
  | "mobileclip-webgpu"
  | "mobileclip-wasm"
  | "heuristic"
  | "unavailable";

/**
 * Something that can judge a photo.
 *
 * Pluggable on purpose: the verdict UI, the thresholds and the three-state logic must work whether
 * or not a 11MB model loaded, on a 2-year-old phone, in an increment with two days left. A scorer
 * that returns `unavailable` is a valid implementation.
 */
export interface PhotoScorer {
  readonly kind: BackendKind;
  /** Whether this backend can produce a verdict at all, given what loaded. */
  ready(): boolean;
  /**
   * Judge a photo against a signature.
   *
   * `image` is a caller-owned object (a canvas or image bitmap). The contract is that an
   * implementation must NOT retain it, must NOT send it anywhere, and must not write it to storage.
   */
  judge(image: ImageBitmap | HTMLCanvasElement, signatureId: VisualSignatureId): Promise<VerifyResult>;
}

/**
 * Thresholds.
 *
 * Tuned by hand against real photos, not derived, and the numbers are deliberately conservative in
 * the direction of "unsure" rather than "not it". See the note above: a wrong rejection costs a
 * child their confidence in the game; a needless "I can't tell" costs them one more try.
 */
export const THRESHOLDS = {
  /** At or above this we believe it. */
  correct: 0.26,

  /** Below this we are reasonably sure it is something else. */
  notIt: 0.17,
} as const;

/** Copy for each state, from the design charter section 3.2. */
export const VERDICT_COPY: Record<Verdict, string> = {
  correct: "Correct.",
  unsure: "I can't tell - try again, or ask the grown-up.",
  "not-it": "That's not it. Keep walking.",
};

/**
 * Turn a similarity into a verdict.
 *
 * `anyMatch` is the best score against ANY signature in the vocabulary, not just the expected one.
 * We need both:
 *
 *   - low score against the expected signature  -> probably not the thing
 *   - but a HIGHER score against some other signature -> the child is standing in front of a
 *     fountain when we asked about a war memorial. Saying "that's not it, keep walking" is correct
 *     and useful there. Saying "I can't tell" would be lazy.
 */
export function decide({ expected, anyMatch }: { expected: number; anyMatch: number }): Verdict {
  if (expected >= THRESHOLDS.correct) return "correct";
  if (expected < THRESHOLDS.notIt) return "not-it";
  // Mid-band: only call it "not it" if some OTHER signature fits the photo markedly better.
  return anyMatch > expected + 0.04 ? "not-it" : "unsure";
}