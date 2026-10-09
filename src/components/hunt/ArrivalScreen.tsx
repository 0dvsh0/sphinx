"use client";

import { useState } from "react";
import type { HuntStop } from "@/lib/riddle";
import { cn } from "@/lib/cn";
import { PhotoVerify } from "./PhotoVerify";
import { ReportGone, ReportGoneLink } from "./ReportGone";
import { ProgressDots } from "@/components/ProgressDots";
import { PrimaryAction } from "@/components/PrimaryAction";

/**
 * The arrival screen: "I've found it" leads here.
 *
 * ---------------------------------------------------------------------------
 * WHY THE PHOTO CHECK IS OFF BY DEFAULT
 * ---------------------------------------------------------------------------
 * A camera pointed at a child is a screen held up in front of their face, which is the exact failure
 * this project exists to avoid. So the check is opt-in, it is skippable in one tap, and the skip is
 * not styled as failure.
 *
 * "Ask the grown-up instead" is a first-class path, not a consolation prize. Many children will walk
 * past a war memorial without ever raising a phone, and that is a perfectly good way to play.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SKIP IS NEVER PENALISED
 * ---------------------------------------------------------------------------
 * No progress bar that counts "verified" stops, no message about unverified places, nothing at the
 * end. If taking photos were rewarded, a child would start photographing everything, including
 * strangers, and we would have built the opposite of the product.
 */
export function ArrivalScreen({
  stop,
  index,
  total,
  placeName,
  onAccepted,
}: {
  stop: HuntStop;
  index: number;
  total: number;
  placeName: string;
  onAccepted: () => void;
}) {
  /** null = the child has not chosen yet, which is the default. */
  const [mode, setMode] = useState<"choose" | "photo" | "report">("choose");

  return (
    <main
      className={cn(
        "flex min-h-dvh flex-col bg-paper px-6",
        "pt-[max(1.25rem,env(safe-area-inset-top))]",
        "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <span className="shrink-0 text-quiet text-ink-soft">
          {index + 1} of {total}
        </span>
        <ProgressDots total={total} current={index} className="justify-end" />
      </header>

      {mode === "report" ? (
        <ReportGone stop={stop} placeName={placeName} onDone={onAccepted} />
      ) : mode === "photo" ? (
        <section className="flex flex-1 flex-col justify-center py-6">
          <PhotoVerify
            signatureId={stop.visual?.id ?? null}
            placeName={stop.name || placeName}
            onAccepted={onAccepted}
            onRetake={() => setMode("choose")}
          />
        </section>
      ) : (
        <>
          <section className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-reveal-fact text-balance text-ink">Are you looking at it?</p>
            {/*
              The hint is the same vocabulary the riddle used, so it never introduces a new idea the
              child was not already given. It is also the only place a grown-up gets concrete help,
              which matters when a child is standing in front of four identical brick walls.
            */}
            {stop.visual && (
              <p className="max-w-xs text-quiet text-ink-soft">
                You are looking for something like: {stop.visual.text}.
              </p>
            )}
          </section>

          <footer className="flex flex-col gap-3">
            {stop.visual ? (
              <>
                <PrimaryAction onClick={() => setMode("photo")}>Check with the camera</PrimaryAction>
                <button
                  type="button"
                  onClick={onAccepted}
                  className="min-h-tap-min rounded-2xl border-2 border-stone px-6 text-quiet text-ink transition-colors duration-150 ease-sphinx hover:bg-sand/60"
                >
                  Yes, I found it
                </button>
              </>
            ) : (
              <>
                <PrimaryAction onClick={onAccepted}>Yes, I found it</PrimaryAction>
                <p className="text-center text-xs text-ink-soft">
                  This place has no photo check, so just look and decide.
                </p>
              </>
            )}

            {/*
              Last, quiet, and underlined rather than boxed. The overwhelmingly common outcome is
              that the child DID find the thing, and a prominent "report a problem" button would
              invite notes from anyone merely bad at the game.
            */}
            <ReportGoneLink stop={stop} onOpen={() => setMode("report")} />
          </footer>
        </>
      )}
    </main>
  );
}