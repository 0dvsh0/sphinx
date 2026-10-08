"use client";

import { useState } from "react";
import type { Hunt } from "@/lib/riddle";
import { RiddleScreen } from "./RiddleScreen";
import { RevealScreen } from "./RevealScreen";
import { PocketOverlay, usePocketMode } from "./PocketMode";

/**
 * The play loop.
 *
 * One route, one piece of state: which riddle, and whether we are showing the riddle or the fact.
 *
 * Deliberately client-side with no router navigation between steps. A hunt played in a park with
 * no signal must not depend on route transitions, history entries, or a server round-trip. Progress
 * persistence (IndexedDB) arrives in increment 3, along with the offline hunt artifact.
 *
 * No "not it" / "can't tell" verdict yet - the photo check arrives in increment 4. "I've found it"
 * is currently the only way forward, which is correct for a design review: the screen under review
 * is the riddle and the reveal, not the verdict UI.
 */
export function HuntShell({ hunt }: { hunt: Hunt }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { pocketed, wake, poke } = usePocketMode();

  const current = hunt.riddles[index];

  function handleNext() {
    if (index === hunt.riddles.length - 1) {
      setRevealed(false);
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
    // Any deliberate action restarts the pocket countdown.
    wake();
  }

  if (!current) return null;

  return (
    <>
      {/*
        A single wrapper owns the transition so the cross-fade happens between screens rather
        than inside one. Opacity only, per the motion rules.
      */}
      <div key={`${current.id}-${revealed ? "reveal" : "hunt"}`} className="sphinx-fade">
        {revealed ? (
          <RevealScreen
            fact={current.fact}
            index={index}
            total={hunt.riddles.length}
            placeName={hunt.placeName}
            onNext={handleNext}
          />
        ) : (
          <RiddleScreen
            riddle={current.riddle}
            index={index}
            total={hunt.riddles.length}
            onFound={() => {
              setRevealed(true);
              poke();
            }}
          />
        )}
      </div>

      {pocketed && <PocketOverlay onWake={wake} />}
    </>
  );
}