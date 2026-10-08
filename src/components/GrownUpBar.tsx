"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "sphinx:relaxed-spacing";

/**
 * Dyslexia-friendly spacing toggle.
 *
 * Spacing only - never letter shapes. Changing letterforms would need a webfont, and we refuse to
 * load one from a third party (it leaks the child's IP and request path, and breaks offline use).
 * Extra letter and word spacing is the part that helps anyway, and it costs nothing.
 *
 * Parent-set and persisted: a nine-year-old should not have to find and operate a legibility
 * setting to be able to read the game.
 */
export function SpacingToggle() {
  const [relaxed, setRelaxed] = useState(false);

  // Read after mount so the server-rendered HTML and the client agree - a hydration mismatch
  // here would flash the wrong spacing at a child who has already set their preference.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "true";
    setRelaxed(stored);
    document.documentElement.classList.toggle("spacing-relaxed", stored);
  }, []);

  const toggle = useCallback(() => {
    setRelaxed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      document.documentElement.classList.toggle("spacing-relaxed", next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={relaxed}
      className={cn(
        "min-h-tap-min rounded-xl border px-3 text-quiet transition-colors duration-150 ease-sphinx",
        relaxed
          ? "border-ink bg-ink text-paper"
          : "border-stone bg-transparent text-ink-soft hover:bg-sand/60",
      )}
    >
      <span aria-hidden className="mr-2 inline-block">
        {relaxed ? "✓" : " "}
      </span>
      Easier-to-read spacing
    </button>
  );
}

/**
 * The grown-ups strip.
 *
 * Visually and spatially separate from the child's interface so a hunt stays uncluttered
 * (design charter section 8). Increment 7 replaces this with the real parent panel - consent gate,
 * hunt review, the stranger-safety script, privacy, note drafts, battery. For now it holds the one
 * legibility setting that belongs in a design review.
 */
export function GrownUpBar({ placeName }: { placeName: string }) {
  return (
    <div className="border-t border-sand bg-paper-raised px-6 py-4">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <p className="text-quiet text-ink-soft">
          <span className="font-medium text-ink">Grown-ups</span> · sample walk: {placeName}
        </p>
        <SpacingToggle />
        <p className="text-xs text-ink-soft">
          Photos and location are handled on this device. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}