"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { PrimaryAction } from "@/components/PrimaryAction";
import type { HuntArtifact } from "@/lib/riddle";
import { recordConsent } from "@/lib/safety/consent";
import { REVEAL_RATIONALE, STRANGER_SCRIPT, STRANGER_SCRIPT_LABEL } from "@/lib/safety/script";

/**
 * Hunt review: every riddle, in full, before the walk.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS SCREEN IS THE WHOLE POINT OF THE CONSENT GATE
 * ---------------------------------------------------------------------------
 * A gate that says "an adult pressed yes" is theatre. The adult has to be able to see what they are
 * agreeing to, which means:
 *
 *   - every riddle AND its reveal fact, not a summary or a count
 *   - which of them are about real people who died, because that changes what a walk through them
 *     feels like, and a grown-up is entitled to decide that before a nine-year-old is standing in
 *     front of a war memorial at 4pm
 *   - the walk's length and start point, so "is this doable before dinner" is answerable
 *
 * `evaluateGate` also compares `stopsReviewed` against the hunt's real stop count, so if the hunt
 * grows after this screen, the consent goes stale and the gate reopens. Without that, nothing stops
 * a hunt changing after review and this screen would be decorative.
 *
 * Nothing here is skipped, collapsed or truncated. A grown-up scanning a summary is not reviewing.
 */
export function HuntReview({
  hunt,
  onApproved,
}: {
  hunt: HuntArtifact;
  onApproved: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  // Respect-framed stops are surfaced first, not buried. A grown-up deciding whether this walk is
  // suitable needs to know about the memorials immediately, not at scroll position 7.
  const ordered = useMemo(() => {
    return [...hunt.stops].sort((a, b) => {
      const rank = (s: (typeof hunt.stops)[number]) => (s.sensitivity === "respect" ? 0 : 1);
      return rank(a) - rank(b);
    });
  }, [hunt.stops]);

  const respectCount = hunt.stops.filter((s) => s.sensitivity === "respect").length;
  const walkMinutes = estimateWalkMinutes(hunt.stops.length);

  return (
    <section aria-labelledby="review-heading" className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 id="review-heading" className="text-2xl font-semibold text-ink">
        Read this walk through
      </h1>
      <p className="mt-2 text-ink-soft">
        {hunt.stops.length} stops around {hunt.placeName}. About {walkMinutes} minutes at a child&apos;s
        pace. Everything they will see is below, in order.
      </p>

      {respectCount > 0 ? (
        <div className="mt-6 rounded-xl border border-stone bg-paper-raised px-4 py-3">
          <p className="font-medium text-ink">
            {respectCount} of {hunt.stops.length} stops are about real people.
          </p>
          <p className="mt-1 text-ink-soft">
            These are memorials and war graves. The reveal is a real fact, said plainly. If that is not
            right for your child today, remove them below or do not start this walk.
          </p>
        </div>
      ) : null}

      <ol className="mt-6 flex flex-col gap-4">
        {ordered.map((stop, index) => (
          <li
            key={stop.id}
            className={cn(
              "rounded-xl border bg-paper-raised px-4 py-4",
              stop.sensitivity === "respect" ? "border-stone" : "border-sand",
            )}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-ink-soft">{index + 1}</span>
              {stop.sensitivity === "respect" ? (
                <span className="rounded border border-stone px-2 py-0.5 text-xs text-ink-soft">
                  About a person
                </span>
              ) : null}
            </div>

            {/* The riddle, in full. Never truncated - a review you cannot finish is not a review. */}
            <p className="mt-2 whitespace-pre-line text-ink">{stop.riddle}</p>

            {/* The reveal, also in full. A grown-up should know the payload before the walk, not
                discover it at stop 4 with their child already standing there. */}
            <p className="mt-3 border-l-2 border-sand pl-3 text-ink-soft">{stop.fact}</p>

            <p className="mt-3 text-xs text-ink-soft">
              {stop.name ? `${stop.name} · ` : ""}
              {categoryLabel(stop.category)}
            </p>
          </li>
        ))}
      </ol>

      {/* The stranger script is read at review time, not buried in a settings page. This is the
          moment a grown-up is deciding whether to let a child play, so it is the moment to show it. */}
      <div className="mt-8 rounded-xl border border-ink bg-paper-raised px-4 py-4">
        <h2 className="font-medium text-ink">{STRANGER_SCRIPT_LABEL}</h2>
        <p className="mt-2 text-ink">{STRANGER_SCRIPT}</p>
        <p className="mt-3 text-sm text-ink-soft">{REVEAL_RATIONALE}</p>
      </div>

      <label className="mt-6 flex min-h-tap-min items-start gap-3 rounded-xl border border-sand px-4 py-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-6 w-6 shrink-0"
        />
        <span className="text-ink">
          I have read all {hunt.stops.length} riddles and the fact behind each one.
        </span>
      </label>

      <div className="mt-4">
        <PrimaryAction
          disabled={!confirmed}
          onClick={() => {
            // Recorded against THIS hunt and THIS stop count, so a later change invalidates it.
            recordConsent(hunt.id, hunt.stops.length);
            onApproved();
          }}
        >
          Let them start the walk
        </PrimaryAction>
      </div>

      {!confirmed ? (
        <p className="mt-3 text-sm text-ink-soft">
          Tick the box once you have read them. There is no rush.
        </p>
      ) : null}
    </section>
  );
}

/**
 * A deliberately rough estimate, and labelled as one.
 *
 * The point is not accuracy, it is answering "is this doable before dinner" in the parent's head.
 * Rounding to whole minutes avoids implying a precision we do not have.
 */
function estimateWalkMinutes(stopCount: number): number {
  // Roughly 2 minutes of walking and looking per stop, plus a fixed 3 for reading the intro.
  return Math.round(stopCount * 2 + 3);
}

/** Turn an OSM tag into words. The parent panel is not a place for `historic:memorial`. */
function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    "tourism:artwork": "public artwork",
    "historic:memorial": "memorial",
    "historic:monument": "monument",
    "historic:ruins": "ruins",
    "amenity:fountain": "fountain",
    "amenity:drinking_water": "drinking water",
    "amenity:place_of_worship": "place of worship",
    "leisure:playground": "playground",
    "natural:tree_row": "row of trees",
  };
  return map[category] ?? category.replace(":", ", ");
}
