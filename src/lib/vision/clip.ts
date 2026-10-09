"use client";

import { createHeuristicScorer } from "./heuristic";
import {
  THRESHOLDS,
  VERDICT_COPY,
  decide,
  type BackendKind,
  type PhotoScorer,
  type VerifyResult,
} from "./types";
import { SIGNATURES, type VisualSignatureId } from "./signatures";

/**
 * The on-device photo scorer: MobileCLIP-S0's vision tower.
 *
 * ---------------------------------------------------------------------------
 * ONLY 11MB, AND ONLY THE VISION HALF
 * ---------------------------------------------------------------------------
 * See signatures.ts for why the vocabulary is closed. The text embeddings are precomputed at build
 * time by scripts/build-visual-index.ts, so the phone downloads the 11.3MB vision tower and nothing
 * else. Shipping the 61MB text tower to encode twenty strings we already encoded would be waste.
 *
 * ---------------------------------------------------------------------------
 * EVERYTHING IS SAME-ORIGIN. THIS IS NOT OPTIONAL.
 * ---------------------------------------------------------------------------
 * transformers.js fetches weights from huggingface.co by DEFAULT. Doing that would break the
 * project's headline privacy claim with a 61MB request to a third party from a child's phone, so:
 *
 *   - allowRemoteModels = false, and localModelPath points at OUR /api/vision/models route
 *   - the ONNX runtime WASM is served from /ort/ out of this repo, not jsdelivr
 *   - npm run check:privacy asserts both
 *
 * The photo itself is decoded into a canvas and handed to the model. It is never uploaded, never
 * written to storage, and never leaves this function.
 */

export type TextEmbeddings = Record<string, number[]>;

export type LoadProgress = { stage: string; percent: number };

/** Encodes a preprocessed image into a projected embedding. */
type Encoder = (image: RawImageLike) => Promise<Float32Array>;

type RawImageLike = unknown;

let scorerPromise: Promise<PhotoScorer> | null = null;

/**
 * Copied from node_modules into public/ort by the postinstall-ish step in
 * docs, so the runtime is served from our own origin.
 */
const ORT_WASM_PATH = "/ort/";
const MODEL_ID = "Xenova/mobileclip_s0";
const MODEL_BASE = "/api/vision/models";

export function resetScorerCache(): void {
  scorerPromise = null;
}

/** True when the browser can plausibly run this. WebGPU is preferred; WASM is the fallback. */
export async function detectBackend(): Promise<{ webgpu: boolean; wasm: boolean; reason?: string }> {
  const hasWebgpu = typeof navigator !== "undefined" && "gpu" in navigator;
  if (hasWebgpu) {
    try {
      const adapter = await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) return { webgpu: true, wasm: true };
    } catch {
      /* fall through to wasm */
    }
  }

  const cores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 1) : 1;
  if (cores >= 2) return { webgpu: false, wasm: true };

  return {
    webgpu: false,
    wasm: false,
    reason: "This device looks too slow to run the photo model. Sphinx will still work - it just cannot tell you if the photo matches.",
  };
}

function cosine(a: Float32Array, b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function loadScorer(onProgress?: (p: LoadProgress) => void): Promise<PhotoScorer> {
  const support = await detectBackend();

  if (!support.webgpu && !support.wasm) {
    onProgress?.({ stage: "Photo model unavailable", percent: 100 });
    return createHeuristicScorer("unavailable");
  }

  try {
    onProgress?.({ stage: "Loading the photo model", percent: 5 });

    const { AutoImageProcessor, CLIPVisionModelWithProjection, RawImage, env } = await import(
      "@huggingface/transformers"
    );

    // THE PRIVACY INVARIANT. Without these two lines transformers.js reaches for huggingface.co.
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = MODEL_BASE;
    env.backends.onnx.wasm!.wasmPaths = ORT_WASM_PATH;

    const device: "webgpu" | "wasm" = support.webgpu ? "webgpu" : "wasm";

    /*
     * AutoImageProcessor, NOT AutoProcessor. AutoProcessor for CLIP would also pull the tokenizer -
     * a 2MB download we have no use for, because the text side is precomputed at build time and
     * lives in /vision/embeddings.json. The model proxy's allowlist deliberately does not include
     * tokenizer.json, so this also keeps the two halves of the design honest.
     */
    const [processor, model, embeddingsRes] = await Promise.all([
      AutoImageProcessor.from_pretrained(MODEL_ID),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
        device,
        dtype: device === "webgpu" ? "fp32" : "q8",
      }),
      fetch("/vision/embeddings.json").then((r) => (r.ok ? (r.json() as Promise<TextEmbeddings>) : {})),
    ]);

    const textEmbeddings = (embeddingsRes ?? {}) as TextEmbeddings;
    const haveText = Object.keys(textEmbeddings).length > 0;

    onProgress?.({ stage: "Photo model ready", percent: 100 });

    // The encoder takes a preprocessed tensor and returns a projection.
    const encode: Encoder = async (image) => {
      const inputs = await processor(image);
      const output = await model(inputs);
      // ORT returns a promise-wrapped Tensor; we only ever need the projected embedding.
      return (await output.image_embeds.data) as Float32Array;
    };

    const kind: BackendKind = device === "webgpu" ? "mobileclip-webgpu" : "mobileclip-wasm";

    return {
      kind,
      ready: () => haveText,
      async judge(image, signatureId): Promise<VerifyResult> {
        if (!haveText) {
          // Model loaded but the text index did not. Never guess - fall back honestly.
          const fallback = createHeuristicScorer("unavailable");
          const result = await fallback.judge(image, signatureId);
          return {
            ...result,
            notice: "The photo model's text index is missing, so this is only a rough guess.",
          };
        }

        // Canvas -> RawImage, entirely in memory. The bitmap is not retained after this returns.
        const raw = await RawImage.fromCanvas(image as HTMLCanvasElement);
        const data = await encode(raw);

        const expected = cosine(data, textEmbeddings[signatureId] ?? []);

        let anyMatch = 0;
        let bestId: string = signatureId;
        for (const signature of SIGNATURES) {
          const vector = textEmbeddings[signature.id];
          if (!vector) continue;
          const score = cosine(data, vector);
          if (score > anyMatch) {
            anyMatch = score;
            bestId = signature.id;
          }
        }

        const verdict = decide({ expected, anyMatch });

        return {
          verdict,
          score: Number(expected.toFixed(3)),
          signatureId,
          backend: kind,
          confidence: "model",
          message: VERDICT_COPY[verdict],
          notice:
            verdict === "unsure"
              ? `The photo was hard to read. If another ${bestId.replace(/-/g, " ")} is nearby, you may be standing at the wrong one.`
              : undefined,
        };
      },
    };
  } catch (error) {
    onProgress?.({ stage: "Using the simple check instead", percent: 100 });
    const fallback = createHeuristicScorer("unavailable");
    const original = fallback.judge;
    fallback.judge = async (image, signatureId) => {
      const result = await original(image, signatureId);
      return {
        ...result,
        notice: `The photo model would not load, so this is a rough guess (${
          error instanceof Error ? error.message : "unknown error"
        }). The photo never left this device either way.`,
      };
    };
    return fallback;
  }
}

export function getScorer(onProgress?: (p: LoadProgress) => void): Promise<PhotoScorer> {
  if (!scorerPromise) scorerPromise = loadScorer(onProgress);
  return scorerPromise;
}

export { THRESHOLDS };