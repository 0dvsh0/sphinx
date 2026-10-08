"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pocketModeDelayMs } from "@/lib/palette";
import { SphinxMark } from "./icons";

/**
 * Pocket mode: the screen goes dark so the child stops looking at it.
 *
 * This is the anti-engagement rule made physical (design charter sections 1 and 2). Every social
 * app a child owns is engineered to keep the screen lit; this one puts it out.
 *
 * Two honesty notes:
 *
 * 1. We cannot switch the phone's screen brightness off from a web page - the Screen Wake Lock API
 *    only keeps a screen ON. So this is an approximation: near-black UI, which on an OLED panel is
 *    visually close to an actually-dark screen. Claiming more than that in the write-up would be
 *    overclaiming.
 * 2. It never engages for keyboard or assistive-technology users. Disappearing content mid-sentence
 *    is hostile to someone navigating by screen reader, and the feature is about glare, not about
 *    them.
 */
export function usePocketMode(delayMs: number = pocketModeDelayMs) {
  const [pocketed, setPocketed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Last input modality. Pocket mode is a glare feature, so pointer use only. */
  const lastInput = useRef<"pointer" | "key">("pointer");

  const wake = useCallback(() => {
    setPocketed(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (lastInput.current === "pointer") setPocketed(true);
    }, delayMs);
  }, [delayMs]);

  /** Reset the countdown without hiding anything - used while the child is still reading. */
  const poke = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (lastInput.current === "pointer") setPocketed(true);
    }, delayMs);
  }, [delayMs]);

  useEffect(() => {
    const onPointer = () => {
      lastInput.current = "pointer";
      poke();
    };
    const onKey = () => {
      lastInput.current = "key";
      wake();
    };
    // Coming back to the tab restarts the countdown rather than snapping straight to pocket.
    const onVisible = () => {
      if (document.visibilityState === "visible") wake();
    };

    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("touchstart", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisible);

    wake();
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poke, wake]);

  return { pocketed, wake, poke };
}

export function PocketOverlay({ onWake }: { onWake: () => void }) {
  return (
    <button
      type="button"
      onClick={onWake}
      // Deliberately does NOT take focus. Stealing focus mid-sentence would be worse than the
      // feature is worth.
      aria-label="Screen dimmed. Tap or press any key to carry on with the hunt."
      className="sphinx-fade fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-pocket text-pocket-ink"
    >
      <SphinxMark className="size-9 opacity-60" />
      <span className="text-quiet opacity-70">Sphinx</span>
      <span className="text-quiet">Tap to carry on</span>
    </button>
  );
}