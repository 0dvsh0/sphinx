/**
 * The exact list of model files this app will fetch, and where they come from.
 *
 * A strict allowlist is the security boundary for the proxy route in
 * src/app/api/vision/models/[...path]/route.ts. Without it, that route would be an open proxy
 * pointed at a third party, driven by a URL the client controls. With it, it can only ever return
 * these specific files.
 *
 /**
 * ---------------------------------------------------------------------------
 * RESOLVED (2026-10-08): THE TEXT TOWER RUNS FINE
 * ---------------------------------------------------------------------------
 * This file previously carried a "KNOWN BLOCKER" saying MobileCLIP-S0's text tower could not run in
 * transformers.js. That diagnosis was wrong, and the error message had said so all along.
 *
 * The failure was a broadcast error in an ONNX Add node: "Attempting to broadcast an axis by a
 * dimension other than 1. 17 by 77". CLIP text towers take a FIXED 77-token sequence, and the
 * tokenizer call was passing a natural-length input of ~17 tokens. One line fixes it:
 *
 *     tokenizer(texts, { padding: "max_length", truncation: true, max_length: 77 })
 *
 * The vision tower had loaded correctly all along; it was only the text side that was malformed, and
 * "the model is unsupported" was the wrong conclusion to draw from one error string. See
 * scripts/build-visual-index.ts.
 *
 * Why the design still stands:
 *   - CLIP ViT-B/32 would be 85MB (vision) + 61MB (text) = 146MB on a phone.
 *   - Our vocabulary is CLOSED - 20 signatures, all derived from OSM categories - so the text side
 *     is precomputed into an 84KB JSON at build time and never shipped.
 *   - The phone downloads an 11.3MB vision tower, served from our own origin.
 *
 * NOTE ON THE TEXT TOWER IN GENERAL: CLIP ViT-B/32 needs 85MB (vision) + 61MB (text) = 146MB on a
 * phone. MobileCLIP-S0's vision tower is 11.3MB, and because our vocabulary is closed we precompute
 * the text side at build time - so no text tower is ever shipped to a child. See signatures.ts.
 */

export const MODEL_REPO = "Xenova/mobileclip_s0";

/** Served from our own origin. The client never sees this. */
export const MODEL_BASE = "/api/vision/models";

/**
 * Only the vision tower, plus the files needed to preprocess an image.
 *
 * `text_model*.onnx` is deliberately absent. See the note above.
 */
export const ALLOWED_MODEL_FILES = [
  "config.json",
  "preprocessor_config.json",
  "onnx/vision_model_quantized.onnx",
] as const;

export type AllowedModelFile = (typeof ALLOWED_MODEL_FILES)[number];

const UPSTREAM = `https://huggingface.co/${MODEL_REPO}/resolve/main`;

export function modelFileUrl(file: AllowedModelFile): string {
  return `${UPSTREAM}/${file}`;
}

/**
 * Where the ONNX runtime WASM is served from.
 *
 * onnxruntime-web's default is a jsdelivr CDN URL, which would be another third-party request from a
 * child's phone. The files are copied into public/ort by scripts/setup-ort.mjs so they come from our
 * own origin.
 */
export const ORT_WASM_PATH = "/ort/";

export const ORT_WASM_FILES = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
] as const;