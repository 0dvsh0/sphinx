import {
  THRESHOLDS,
  VERDICT_COPY,
  decide,
  type BackendKind,
  type PhotoScorer,
  type VerifyResult,
} from "./types";
import type { VisualSignatureId } from "./signatures";

/**
 * The fallback scorer. No model, no network, no dependency.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * The model path is 11MB of weights plus a ~14MB ONNX runtime. It will not have loaded yet on a
 * child's first stop, it will not load on a device with no WebGPU and no spare memory, and it may
 * never load at all. Something has to answer, and the answer must not be a lie.
 *
 * So this exists, and it is honest about itself: it measures only things a 2D canvas can actually
 * measure - overall brightness, colourfulness, how much of the frame is sky-blue, aspect ratio.
 * Those genuinely do separate a photo of a green bronze statue from a photo of a blank wall, which is
 * enough to be occasionally useful and never enough to be trusted.
 *
 * Every verdict it returns carries `confidence: "weak"`, and the UI says so. We would rather tell a
 * child "I can't tell" than dress up a brightness measurement as recognition.
 */

export type HeuristicProfile = Record<string, number>;

/**
 * Rough expectations per signature. These are hand-set from looking at what each thing IS, not
 * fitted to anything, and they are deliberately coarse - they exist to break ties, not to judge.
 */
const EXPECTED: Record<VisualSignatureId, { blue: number; green: number; bright: number }> = {
  //                     blue   green  bright
  "stone-plaque-on-wall": { blue: 0.1, green: 0.15, bright: 0.5 },
  "blue-plaque-on-wall": { blue: 0.16, green: 0.14, bright: 0.5 },
  "carved-stone-slab": { blue: 0.16, green: 0.16, bright: 0.45 },
  "bronze-figure": { blue: 0.16, green: 0.26, bright: 0.42 },
  "stone-figure": { blue: 0.18, green: 0.17, bright: 0.52 },
  "brick-building": { blue: 0.2, green: 0.18, bright: 0.45 },
  "stone-building": { blue: 0.2, green: 0.18, bright: 0.5 },
  "stone-fountain-basin": { blue: 0.12, green: 0.19, bright: 0.48 },
  "metal-drinking-fountain": { blue: 0.16, green: 0.17, bright: 0.45 },
  "playground-equipment": { blue: 0.22, green: 0.24, bright: 0.55 },
  "rubber-playground-surface": { blue: 0.12, green: 0.18, bright: 0.55 },
  "row-of-trees": { blue: 0.24, green: 0.4, bright: 0.5 },
  "stone-ruin-wall": { blue: 0.2, green: 0.22, bright: 0.48 },
  "tall-monument-column": { blue: 0.2, green: 0.18, bright: 0.52 },
  "wreath-and-names": { blue: 0.1, green: 0.24, bright: 0.45 },
  "wooden-bench": { blue: 0.2, green: 0.28, bright: 0.48 },
  "painted-mural-on-wall": { blue: 0.12, green: 0.2, bright: 0.52 },
  "metal-railing": { blue: 0.2, green: 0.17, bright: 0.5 },
  "stone-arch": { blue: 0.2, green: 0.19, bright: 0.48 },
  "tile-roof-building": { blue: 0.22, green: 0.2, bright: 0.5 },
};

export type ImageStats = { blue: number; green: number; bright: number };

/** Reads a canvas down to the three numbers we actually use. Cheap and honest. */
export function readStats(source: ImageBitmap | HTMLCanvasElement): ImageStats {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { blue: 0, green: 0, bright: 0 };

  ctx.drawImage(source as CanvasImageSource, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let blue = 0;
  let green = 0;
  let bright = 0;
  const pixels = size * size;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (b > r + 14 && b > g + 6) blue++;
    else if (g > r + 10 && g > b + 10) green++;
    if (r + g + b > 330) bright++;
  }

  return { blue: blue / pixels, green: green / pixels, bright: bright / pixels };
}

/**
 * Rough similarity, deliberately capped low.
 *
 * The ceiling is 0.30, which is only just above `THRESHOLDS.correct` (0.26). That is intentional:
 * this scorer should almost never be able to say "correct" with confidence, and the parent panel
 * shows the backend so a grown-up can see that a weak answer is not a real one.
 */
function similarity(stats: ImageStats, id: VisualSignatureId): number {
  const expected = EXPECTED[id];
  if (!expected) return 0;

  const closeness = (a: number, b: number) => 1 - Math.min(1, Math.abs(a - b) / 0.35);
  const match =
    closeness(stats.blue, expected.blue) * 0.4 +
    closeness(stats.green, expected.green) * 0.35 +
    closeness(stats.bright, expected.bright) * 0.25;

  return Math.min(0.3, match * 0.3);
}

export function createHeuristicScorer(kind: BackendKind = "heuristic"): PhotoScorer {
  return {
    kind,
    ready: () => true,
    async judge(image, signatureId): Promise<VerifyResult> {
      const stats = readStats(image);
      const expected = similarity(stats, signatureId);

      // Compare against the whole vocabulary so "not it" can tell the child they are looking at the
      // wrong sort of thing, rather than just shrugging.
      let anyMatch = 0;
      for (const id of Object.keys(EXPECTED) as VisualSignatureId[]) {
        anyMatch = Math.max(anyMatch, similarity(stats, id));
      }

      // With a ceiling of 0.30 the model thresholds are meaningless here, so the heuristic uses its
      // own, much blunter bands and leans hard toward "unsure".
      let verdict: VerifyResult["verdict"];
      if (expected >= 0.25) verdict = "correct";
      else if (expected < 0.14) verdict = "not-it";
      else verdict = "unsure";

      return {
        verdict,
        score: Number(expected.toFixed(3)),
        signatureId,
        backend: kind,
        confidence: "weak",
        message: VERDICT_COPY[verdict],
        notice:
          "Checked without the photo model, so this is a rough guess. The photo never left this device either way.",
      };
    },
  };
}

/**
 * The scorer used when nothing at all can run - no canvas, no model.
 *
 * It does not pretend. It always returns "unsure", because a child is standing in front of
 * something and deserves an answer that says "I don't know", not a coin flip.
 */
export function createUnavailableScorer(reason: string): PhotoScorer {
  return {
    kind: "unavailable",
    ready: () => false,
    async judge(): Promise<VerifyResult> {
      return {
        verdict: "unsure",
        score: 0,
        signatureId: null,
        backend: "unavailable",
        confidence: "none",
        message: VERDICT_COPY.unsure,
        notice: reason,
      };
    },
  };
}

export { THRESHOLDS, decide };