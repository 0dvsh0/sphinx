"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { SpacingToggle } from "@/components/GrownUpBar";
import { readConsents, revokeAll, revokeConsent } from "@/lib/safety/consent";
import { KYL_DISCLOSURE, STRANGER_SCRIPT, STRANGER_SCRIPT_LABEL, STRANGER_SCRIPT_RATIONALE } from "@/lib/safety/script";

const KYL_KEY = "sphinx:kyl";

/**
 * The parent panel.
 *
 * Replaces the placeholder grown-ups strip. Everything here is either a safety control or the
 * disclosure behind one. Nothing here is engagement, and nothing here is in the child's interface.
 *
 * The panel is a route rather than a slide-over on purpose: a slide-over that can be dismissed by
 * accident is not a place to put a stranger-safety script. `/parent` is boring and it stays put.
 */
export function ParentPanel({ placeName }: { placeName?: string }) {
  const [kyl, setKyl] = useState(false);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [consents, setConsents] = useState<{ huntId: string; grantedAt: string; stopsReviewed: number }[]>(
    [],
  );
  const [whyScript, setWhyScript] = useState(false);

  // Read after mount to keep server and client markup identical.
  useEffect(() => {
    setKyl(localStorage.getItem(KYL_KEY) === "true");
    setConsents(readConsents());
  }, []);

  useEffect(() => subscribeBattery(setBattery), []);

  const toggleKyl = useCallback(() => {
    setKyl((prev) => {
      const next = !prev;
      localStorage.setItem(KYL_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Grown-ups</h1>
        <p className="mt-1 text-ink-soft">
          {placeName ? `Settings for the walk around ${placeName}. ` : ""}
          Everything here stays on this device.
        </p>
      </header>

      <Section title="If anyone asks them about this game">
        <p className="text-ink">{STRANGER_SCRIPT}</p>
        <button
          type="button"
          onClick={() => setWhyScript((v) => !v)}
          aria-expanded={whyScript}
          className="mt-3 min-h-tap-min text-left text-sm text-ink-soft underline underline-offset-4"
        >
          {whyScript ? "Hide why this is worded this way" : "Why is it worded this way?"}
        </button>
        {whyScript ? <p className="mt-2 text-sm text-ink-soft">{STRANGER_SCRIPT_RATIONALE}</p> : null}
      </Section>

      <Section title="Know Your Location">
        <p className="text-sm text-ink-soft">{KYL_DISCLOSURE}</p>
        <ToggleButton on={kyl} onClick={toggleKyl} label="Share location in an emergency" />
        {kyl ? (
          <div className="mt-3 rounded-xl border border-sand px-4 py-3">
            <p className="text-sm text-ink-soft">
              On. During a walk, a &ldquo;share my location&rdquo; button appears on the riddle screen. It
              does nothing until pressed, and it never includes photos or answers.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Location sharing needs a secure connection. Sphinx works in airplane mode, so on a walk
              with no signal this button will be greyed out rather than pretending to work.
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Reading">
        <SpacingToggle />
        <p className="mt-2 text-sm text-ink-soft">
          Increases letter and word spacing. Letter shapes are unchanged, because loading a
          dyslexia-specific typeface from the internet would send this child&apos;s browsing data to a
          company we do not control, and would break when there is no signal.
        </p>
      </Section>

      <Section title="This phone">
        {/* Battery lives here and nowhere else. A child mid-hunt does not need to know the battery is
            at 12% - they need the grown-up to know. */}
        <p className="text-ink-soft">
          {battery === null
            ? "Checking..."
            : `${battery.level}% · ${battery.charging ? "charging" : "on battery"}`}
        </p>
        {battery !== null && !battery.charging && battery.level <= 20 ? (
          <p className="mt-2 text-ink">
            Low. Everything still works in airplane mode, but the screen is hardest to read in
            daylight at low brightness.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-ink-soft">
          Sphinx needs no signal once a walk is saved. That is a safety feature: a walk still works in
          a place with no bars, in a basement car park, or abroad.
        </p>
      </Section>

      <Section title="Walks you have approved">
        {consents.length === 0 ? (
          <p className="text-sm text-ink-soft">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {consents.map((c) => (
              <li key={c.huntId} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-soft">
                  {c.stopsReviewed} stops · {formatWhen(c.grantedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setConsents(revokeConsent(c.huntId) ? readConsents() : consents)}
                  className="min-h-tap-min rounded-lg border border-stone px-3 text-sm text-ink hover:bg-sand/60"
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-ink-soft">
          Withdrawing blocks that walk from starting again on this device. It does not delete it, because
          a walk is a child&apos;s plan and deleting it on their phone would be worse than useless.
        </p>
      </Section>

      <Section title="Privacy">
        <Link
          href="/privacy"
          className="inline-flex min-h-tap-min items-center text-ink underline underline-offset-4"
        >
          What this app sends, and what it does not
        </Link>
        <p className="mt-2 text-sm text-ink-soft">
          Short version: photos and location never leave this phone, and there is no account.
        </p>
      </Section>

      <Section title="Done with this?">
        <button
          type="button"
          onClick={() => {
            revokeAll();
            setConsents([]);
          }}
          className="min-h-tap-min rounded-lg border border-stone px-4 text-ink hover:bg-sand/60"
        >
          Withdraw all approvals and clear settings
        </button>
        <p className="mt-2 text-sm text-ink-soft">
          Clears the age band, the approvals and the legibility setting from this browser. Saved walks
          stay, because deleting a child&apos;s walk is not ours to do.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-sand pt-6">
      <h2 className="font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ToggleButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "min-h-tap-min self-start rounded-xl border px-4 text-left transition-colors duration-150 ease-sphinx",
        on ? "border-ink bg-ink text-paper" : "border-stone bg-transparent text-ink hover:bg-sand/60",
      )}
    >
      {/* Tick as well as colour: never signal state with colour alone. */}
      <span aria-hidden className="mr-2 inline-block">
        {on ? "✓" : " "}
      </span>
      {label}
    </button>
  );
}

/**
 * Battery state via the Battery Status API, where it exists.
 *
 * Returns null everywhere it does not - Firefox and most desktop browsers have no Battery API - and
 * the UI says "Checking..." rather than a number. An invented 100% would be worse than nothing here,
 * because a grown-up relying on it at 12% would be misled.
 */
type BatteryStatus = { level: number; charging: boolean };

function subscribeBattery(onUpdate: (s: BatteryStatus | null) => void): () => void {
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<BatteryStatus & { addEventListener: (t: string, f: () => void) => void }>;
  };
  if (typeof nav.getBattery !== "function") {
    onUpdate(null);
    return () => {};
  }
  let cancelled = false;
  nav
    .getBattery()
    .then((battery) => {
      if (cancelled) return;
      const publish = () => onUpdate({ level: Math.round(battery.level * 100), charging: battery.charging });
      publish();
      battery.addEventListener("levelchange", publish);
      battery.addEventListener("chargingchange", publish);
    })
    .catch(() => onUpdate(null));
  return () => {
    cancelled = true;
  };
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "earlier";
  }
}
