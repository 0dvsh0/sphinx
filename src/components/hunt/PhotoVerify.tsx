"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisualSignatureId } from "@/lib/vision/signatures";
import type { VerifyResult } from "@/lib/vision/types";
import { getScorer, detectBackend } from "@/lib/vision/clip";
import { createHeuristicScorer } from "@/lib/vision/heuristic";
import { FoundIcon, UnsureIcon, WrongIcon } from "@/components/icons";
import { PrimaryAction } from "@/components/PrimaryAction";

/**
 * Take a photo, judge it on the device, say one of three things.
 *
 * ---------------------------------------------------------------------------
 * THE PRIVACY GUARANTEE, AND WHERE IT LIVES
 * ---------------------------------------------------------------------------
 * A child's photo is a picture of where they are and possibly of them. It is drawn into a canvas,
 * handed to a scorer, and dropped. There is no fetch, no FormData and no storage anywhere in this
 * component - and `npm run check:privacy` fails the build if one appears.
 *
 * That is the whole reason the photo check runs on the phone rather than on a server. A server-side
 * check would have been easier to build and would have been the wrong thing to build.
 *
 * ---------------------------------------------------------------------------
 * THREE STATES, AND THE MIDDLE ONE IS NOT AN ERROR
 * ---------------------------------------------------------------------------
 * See src/lib/vision/types.ts. A similarity score is a plausibility check, not proof of identity. A
 * child who photographs the right thing badly must never be told they are wrong, so "I can't tell"
 * is a first-class outcome with its own icon and its own copy - not an error state.
 */
export function PhotoVerify({
  signatureId,
  placeName,
  onAccepted,
  onRetake,
}: {
  signatureId: VisualSignatureId | null;
  placeName: string;
  onAccepted: () => void;
  onRetake: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraState, setCameraState] = useState<"idle" | "starting" | "ready" | "denied" | "unsupported">(
    "idle",
  );
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  /** Release the camera the moment we leave. A child's camera staying open is a battery and privacy bug. */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCameraState("starting");
    setResult(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    try {
      // A cheap rear camera is plenty for checking whether the right kind of thing is in frame.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");

      // Tell the grown-up once, quietly, what this device will actually be able to do.
      const support = await detectBackend();
      if (support.reason) setLoadNote(support.reason);
    } catch (error) {
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setCameraState(denied ? "denied" : "unsupported");
    }
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    setResult(null);

    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      // 224 is what the model expects; anything larger is wasted work on a phone.
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no canvas context");
      ctx.drawImage(video, 0, 0, 224, 224);

      if (!signatureId) {
        // Nothing to compare against. Saying so is the honest answer.
        setResult({
          verdict: "unsure",
          score: 0,
          signatureId: null,
          backend: "unavailable",
          confidence: "none",
          message: "I can't tell - try again, or ask the grown-up.",
          notice: "This place has no photo signature yet, so the check cannot run.",
        });
        return;
      }

      // Try the model first; it silently falls back to the heuristic if it cannot load.
      const scorer = await getScorer((p) => setLoadNote(p.stage));
      const outcome = await scorer.judge(canvas, signatureId);
      setResult(outcome);
      setLoadNote(outcome.notice ?? loadNote);

      if (outcome.verdict === "correct") {
        // Release the camera before the reveal takes over the screen.
        stopCamera();
      }
    } catch (error) {
      setResult({
        verdict: "unsure",
        score: 0,
        signatureId,
        backend: "unavailable",
        confidence: "none",
        message: "I can't tell - try again, or ask the grown-up.",
        notice: `The check could not run: ${error instanceof Error ? error.message : "unknown"}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const accepted = result?.verdict === "correct";

  return (
    <div className="flex flex-col gap-4">
      {/* Viewfinder. Square, because the model wants 224x224 and because a square frame is easier
          for a child to aim at a single object. */}
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border-2 border-stone bg-ink/5">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera preview. Point it at what you found."
          className={`size-full object-cover ${cameraState === "ready" ? "" : "opacity-0"}`}
        />

        {cameraState !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <p className="text-quiet text-ink-soft">
              {cameraState === "starting" && "Opening the camera…"}
              {cameraState === "idle" && "Point the camera at what you found."}
              {cameraState === "denied" &&
                "Sphinx needs the camera to check your photo. You can still ask the grown-up."}
              {cameraState === "unsupported" && "This browser will not let Sphinx use the camera."}
            </p>
          </div>
        )}

        {result && (
          <div
            className={`absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 py-3 text-left ${
              accepted ? "bg-found text-paper" : "bg-ink/85 text-paper"
            }`}
            aria-live="polite"
          >
            <span className="shrink-0">
              {result.verdict === "correct" ? (
                <FoundIcon className="size-6" />
              ) : result.verdict === "unsure" ? (
                <UnsureIcon className="size-6" />
              ) : (
                <WrongIcon className="size-6" />
              )}
            </span>
            <span className="text-quiet">{result.message}</span>
          </div>
        )}
      </div>

      {loadNote && (
        <p className="text-center text-xs text-ink-soft">
          {loadNote}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {accepted ? (
          <PrimaryAction onClick={onAccepted}>Next</PrimaryAction>
        ) : cameraState === "ready" ? (
          <>
            <PrimaryAction onClick={takePhoto} tone={busy ? "quiet" : "stone"}>
              {busy ? "Looking…" : result ? "Take another" : "Take the photo"}
            </PrimaryAction>
            {result && (
              <button
                type="button"
                onClick={onRetake}
                className="min-h-tap-min rounded-2xl border-2 border-stone px-6 text-quiet text-ink hover:bg-sand/60"
              >
                Ask the grown-up instead
              </button>
            )}
          </>
        ) : (
          <PrimaryAction onClick={startCamera} tone={cameraState === "denied" ? "quiet" : "stone"}>
            Open the camera
          </PrimaryAction>
        )}
      </div>

      {result && result.confidence === "weak" && (
        <p className="text-center text-xs text-ink-soft">
          Checked without the photo model, so treat this as a guess. The photo stayed on this device.
        </p>
      )}

      {/* The parent panel's honest version: what actually ran, and how much to trust it. */}
      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer text-center underline underline-offset-2">
          Grown-ups: what just happened
        </summary>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 rounded-xl border border-sand p-3">
          <dt className="font-medium text-ink">Place</dt>
          <dd>{placeName}</dd>
          <dt className="font-medium text-ink">Backend</dt>
          <dd>{result?.backend ?? "not run yet"}</dd>
          <dt className="font-medium text-ink">Confidence</dt>
          <dd>
            {result?.confidence === "model"
              ? "from the on-device model"
              : result?.confidence === "weak"
                ? "rough guess only"
                : "nothing"}
          </dd>
          <dt className="font-medium text-ink">Similarity</dt>
          <dd>{result ? result.score.toFixed(3) : "-"}</dd>
        </dl>
        <p className="mt-2">
          A similarity score is a plausibility check, not proof. It cannot tell one bronze figure from
          another, so Sphinx says &ldquo;I can&rsquo;t tell&rdquo; rather than guessing. The photo was
          never uploaded.
        </p>
      </details>
    </div>
  );
}