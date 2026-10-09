"use client";

import { useEffect, useState } from "react";
import type { HuntArtifact, SavedHunt } from "@/lib/riddle";
import { getHunt, saveHunt } from "@/lib/offline/store";
import { SavedHuntPlayer } from "@/components/hunt/SavedHuntPlayer";

/**
 * Seeds a baked hunt into IndexedDB, then plays it through the real offline path.
 *
 * This is the demo, and it is built the way a real hunt is played rather than as a shortcut. The
 * hunt goes into the same store, the same player reads it, and the same service worker caches the
 * shell - so a demo that works here is evidence the real thing works, instead of a parallel code
 * path that only exists for screenshots.
 *
 * Baking the hunt is what makes the demo possible with no network and no API key, which
 * AGENTS.md requires: a demo that depends on a paid service is a demo that breaks on submission day.
 */
export function SeededDemo({ artifact }: { artifact: HuntArtifact }) {
  const [huntId, setHuntId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function seed() {
      try {
        // A stable id means revisiting the demo resumes rather than duplicating.
        const existing = await getHunt(artifact.id);
        if (existing) {
          if (!cancelled) setHuntId(artifact.id);
          return;
        }
        const toSave: SavedHunt = { ...artifact, currentStop: 0 };
        await saveHunt(toSave);
        if (!cancelled) setHuntId(artifact.id);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void seed();
    return () => {
      cancelled = true;
    };
  }, [artifact]);

  if (failed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
        <h1 className="text-xl font-semibold">This device will not let us store the walk</h1>
        <p className="max-w-xs text-sm text-ink-soft">
          Sphinx saves walks on the device so they work with no signal. Your browser is blocking
          storage, usually private browsing.
        </p>
      </main>
    );
  }

  if (!huntId) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="text-ink-soft">Getting your walk…</p>
      </main>
    );
  }

  return <SavedHuntPlayer huntId={huntId} />;
}