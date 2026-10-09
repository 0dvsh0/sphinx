"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedHunt } from "@/lib/riddle";
import { advanceHunt, getHunt } from "@/lib/offline/store";
import { RiddleScreen } from "@/components/RiddleScreen";
import { RevealScreen } from "@/components/RevealScreen";
import { PocketOverlay, usePocketMode } from "@/components/PocketMode";
import { PrimaryAction } from "@/components/PrimaryAction";
import { DistanceHint, useDistanceHint } from "./DistanceHint";
import { ArrivalScreen } from "./ArrivalScreen";
import { SphinxMark } from "@/components/icons";
import { evaluateGate, explainGate, readAgeBand, readConsents, type GateDecision } from "@/lib/safety/consent";
import { HuntReview } from "@/components/parent/HuntReview";

type Phase = "loading" | "missing" | "locked" | "review" | "intro" | "riddle" | "arrive" | "reveal" | "done";

/**
 * Plays a hunt that already lives on this device.
 *
 * This is the offline guarantee, made concrete: after this component mounts, the only thing it needs
 * is IndexedDB. It makes no network requests at all, so a hunt built at home plays in a park with
 * the phone in aeroplane mode. That is also a safety requirement, not just a feature - see
 * PROJECT_CONTEXT.md section 2.2, a phone that dies mid-hunt in an unfamiliar place is a real-world
 * failure.
 *
 * Progress is written back to IndexedDB on every advance, so closing the tab is not a failure state
 * and a child never loses their place.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CONSENT GATE IS RE-CHECKED HERE AND NOT ONLY AT BUILD TIME
 * ---------------------------------------------------------------------------
 * Because the person tapping this button is the child. A gate enforced only where a grown-up happens
 * to be looking is not a gate; it is a step that got skipped.
 *
 * So the decision is re-evaluated on the way in, from the same pure function the build screen used.
 * Two cases this catches that build-time-only enforcement would miss:
 *
 *   - Consent was withdrawn in the parent panel after the walk was built.
 *   - The hunt's stop count changed after review, so the consent on file is stale. `evaluateGate`
 *     compares the recorded count against the real one for exactly this.
 *
 * When the gate blocks, the only way forward is the review screen. That is deliberate friction: a
 * child cannot start a walk an adult has not seen, and cannot talk their way past it either.
 */
export function SavedHuntPlayer({ huntId }: { huntId: string }) {
  const [hunt, setHunt] = useState<SavedHunt | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [hintsOn, setHintsOn] = useState(false);
  const [gate, setGate] = useState<Extract<GateDecision, { allowed: false }> | null>(null);
  const { pocketed, wake, poke } = usePocketMode();

  useEffect(() => {
    let cancelled = false;
    getHunt(huntId)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setPhase("missing");
          return;
        }
        setHunt(found);

        // The gate runs on the way in, not at build time only. See the note above.
        const decision = evaluateGate({
          ageBand: readAgeBand(),
          huntId: found.id,
          stopsInHunt: found.stops.length,
          consents: readConsents(),
        });
        if (!decision.allowed) {
          setGate(decision);
          setPhase("locked");
          return;
        }

        setPhase(found.finishedAt ? "done" : "intro");
      })
      .catch(() => {
        if (!cancelled) setPhase("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [huntId]);

  const stop = hunt?.stops[phase === "reveal" || phase === "riddle" || phase === "arrive" ? hunt.currentStop : 0] ?? null;
  const distance = useDistanceHint(stop?.lat, stop?.lon, hintsOn);

  /** Persist progress before moving on, so a crash cannot desync the screen from the store. */
  const goTo = useCallback(
    async (nextStop: number, finished: boolean, nextPhase: Phase) => {
      setPhase(nextPhase);
      poke();
      if (!hunt) return;
      try {
        await advanceHunt(hunt.id, nextStop, finished);
        setHunt((current) =>
          current
            ? { ...current, currentStop: nextStop, ...(finished ? { finishedAt: new Date().toISOString() } : {}) }
            : current,
        );
      } catch {
        // A failed write must not block the child. Losing a resume point is survivable; a frozen
        // screen mid-walk is not.
      }
    },
    [hunt, poke],
  );

  const handleFound = useCallback(() => {
    if (hunt) void goTo(hunt.currentStop, false, "reveal");
  }, [goTo, hunt]);

  const handleNext = useCallback(() => {
    if (!hunt) return;
    const isLast = hunt.currentStop >= hunt.stops.length - 1;
    void goTo(isLast ? 0 : hunt.currentStop + 1, isLast, isLast ? "done" : "riddle");
  }, [goTo, hunt]);

  if (phase === "loading") return <Centred message="Getting your walk…" />;

  if (phase === "missing" || !hunt) {
    return (
      <Centred
        message="This walk is not on this device."
        detail="Hunts are built once and saved here, so a walk works with no signal. This one was never saved, or was cleared."
      />
    );
  }

  if (phase === "locked" || phase === "review") {
    // Both phases show the review screen. `review` is reached by tapping through, which makes the
    // gate feel like a step rather than a wall - a child who cannot tell the difference between
    // "blocked" and "broken" will assume it is broken.
    return (
      <main className="min-h-dvh bg-paper">
        {phase === "locked" ? (
          <div className="mx-auto w-full max-w-2xl px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
            <div className="rounded-xl border border-ink bg-paper-raised px-4 py-4">
              <h1 className="font-medium text-ink">A grown-up needs to read this walk first</h1>
              <p className="mt-1 text-ink-soft">
                {gate ? explainGate(gate) : "This walk has not been reviewed yet."}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                That is not you being in trouble. Every riddle and every fact is on the next screen so a
                grown-up knows what you will find before you go.
              </p>
              <div className="mt-4">
                <PrimaryAction onClick={() => setPhase("review")}>Show me the walk</PrimaryAction>
              </div>
            </div>
          </div>
        ) : null}
        <HuntReview
          hunt={hunt}
          onApproved={() => {
            setGate(null);
            setPhase(hunt.finishedAt ? "done" : "intro");
          }}
        />
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <Centred
        title={hunt.placeName}
        detail={`${hunt.stops.length} places, all within ${hunt.radiusMetres} metres of where you started. Nothing is downloaded - this walk works with no signal.`}
      >
        <PrimaryAction onClick={() => void goTo(hunt.currentStop, false, "riddle")}>
          Start the walk
        </PrimaryAction>
        <HintToggle enabled={hintsOn} onToggle={() => setHintsOn((v) => !v)} />
        <p className="text-xs text-ink-soft">
          Photos and location stay on this device. Nothing is uploaded.
        </p>
      </Centred>
    );
  }

  if (phase === "done") {
    return (
      <Centred
        title="Walk finished"
        detail={`You found ${hunt.stops.length} places in ${hunt.placeName}. Every one of them is really there - the map says so.`}
      >
        <PrimaryAction onClick={() => void goTo(0, false, "intro")}>Walk it again</PrimaryAction>
        <a
          href="/build"
          className="flex min-h-tap-min w-full items-center justify-center rounded-2xl border-2 border-stone px-6 text-quiet text-ink hover:bg-sand/60"
        >
          Build a different walk
        </a>
      </Centred>
    );
  }

  if (!stop) return <Centred message="That stop is missing." />;

  return (
    <>
      <div key={`${stop.id}-${phase}`} className="sphinx-fade">
        {phase === "arrive" ? (
          <ArrivalScreen
            stop={stop}
            index={hunt.currentStop}
            total={hunt.stops.length}
            placeName={hunt.placeName}
            onAccepted={handleFound}
          />
        ) : phase === "reveal" ? (
          <RevealScreen
            fact={stop.fact}
            index={hunt.currentStop}
            total={hunt.stops.length}
            placeName={hunt.placeName}
            onNext={handleNext}
          />
        ) : (
          <RiddleScreen
            riddle={stop.riddle}
            index={hunt.currentStop}
            total={hunt.stops.length}
            onFound={() => void goTo(hunt.currentStop, false, "arrive")}
          >
            {/* Adult-gated. Off by default: a child looking at a screen instead of their
                surroundings is the exact failure this project is trying to avoid. */}
            <DistanceHint distance={distance} enabled={hintsOn} />
          </RiddleScreen>
        )}
      </div>
      {pocketed && <PocketOverlay onWake={wake} />}
    </>
  );
}

function HintToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={`min-h-tap-min rounded-xl border px-3 text-quiet transition-colors duration-150 ease-sphinx ${
        enabled ? "border-ink bg-ink text-paper" : "border-stone text-ink-soft hover:bg-sand/60"
      }`}
    >
      {enabled ? "Distance hints on" : "Turn on distance hints"}
    </button>
  );
}

function Centred({
  title,
  message,
  detail,
  children,
}: {
  title?: string;
  message?: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      className="flex min-h-dvh flex-col bg-paper px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <SphinxMark className="size-10 text-stone" />
        {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
        {message && <p className="text-lg text-ink-soft">{message}</p>}
        {detail && <p className="max-w-xs text-sm text-ink-soft">{detail}</p>}
      </div>
      <footer className="flex flex-col gap-3">{children}</footer>
    </main>
  );
}