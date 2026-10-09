"use client";

import { useEffect, useState } from "react";

/**
 * The distance hint.
 *
 * Adult-gated and off by default, because a child staring at a number on a screen is the exact
 * failure this project exists to avoid. On, it is deliberately not a map and not a compass:
 *
 *   - A MAP that pinpoints the target ends the game (see PROJECT_CONTEXT.md section 8).
 *   - A compass needs a heading, which needs movement permission, which is more to ask of a child
 *     than this feature is worth.
 *
 * Steps and minutes instead of metres, because "about 400 steps" is a thing a nine-year-old can act
 * on and "380 metres" is not.
 */
export type DistanceState =
  | { kind: "off" }
  | { kind: "denied" }
  | { kind: "waiting" }
  | { kind: "unknown" }
  | { kind: "near"; steps: number; minutes: number }
  | { kind: "far"; steps: number; minutes: number };

const EARTH_RADIUS_M = 6_371_000;

/** Average adult stride, and a child's walking pace. Both deliberately conservative. */
const STRIDE_METRES = 0.75;
const WALK_METRES_PER_MINUTE = 70;

/** Only the player is asked. Rounding to a friendly bucket stops the number twitching every step. */
function roundFriendly(value: number, steps: number): number {
  if (steps >= 20) return Math.round(value / 100) * 100;
  if (steps >= 10) return Math.round(value / 10) * 10;
  return Math.round(value);
}

export function useDistanceHint(lat?: number, lon?: number, enabled = false): DistanceState {
  const [state, setState] = useState<DistanceState>({ kind: "off" });

  useEffect(() => {
    if (!enabled) {
      setState({ kind: "off" });
      return;
    }
    if (typeof lat !== "number" || typeof lon !== "number") {
      setState({ kind: "unknown" });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ kind: "unknown" });
      return;
    }

    let cancelled = false;
    setState({ kind: "waiting" });

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        const metres = haversineMetres(
          position.coords.latitude,
          position.coords.longitude,
          lat,
          lon,
        );
        // Under ~25m of GPS noise, the child is standing on it.
        if (metres < 20) {
          setState({ kind: "near", steps: 0, minutes: 0 });
          return;
        }
        const rawSteps = metres / STRIDE_METRES;
        setState({
          kind: metres < 200 ? "near" : "far",
          steps: roundFriendly(metres, rawSteps),
          minutes: Math.max(1, roundFriendly(metres / WALK_METRES_PER_MINUTE, rawSteps)),
        });
      },
      (error) => {
        if (cancelled) return;
        setState({ kind: error.code === error.PERMISSION_DENIED ? "denied" : "unknown" });
      },
      { enableHighAccuracy: false, maximumAge: 5_000, timeout: 15_000 },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watch);
    };
  }, [lat, lon, enabled]);

  return state;
}

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Renders the hint. Sits quietly above the one primary action, never competing with it. */
export function DistanceHint({ distance, enabled }: { distance: DistanceState; enabled: boolean }) {
  if (!enabled) return null;

  let text: string | null = null;
  switch (distance.kind) {
    case "waiting":
      text = "Working out where you are…";
      break;
    case "denied":
      text = null;
      break;
    case "near":
      text = distance.steps === 0 ? "You are standing on it." : `About ${distance.steps} steps.`;
      break;
    case "far":
      text = `About ${distance.steps} steps, ${distance.minutes} minutes.`;
      break;
    case "unknown":
      text = "Could not work out where you are.";
      break;
    case "off":
      text = null;
      break;
  }

  if (!text) return null;

  return (
    // aria-live so the value is announced without stealing focus from the primary action.
    <p aria-live="polite" className="text-center text-quiet text-ink-soft">
      {text}
    </p>
  );
}