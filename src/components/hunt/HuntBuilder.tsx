"use client";

import { useEffect, useState } from "react";
import type { HuntArtifact, SavedHunt } from "@/lib/riddle";
import { listHunts, saveHunt } from "@/lib/offline/store";
import { app } from "@/lib/config";
import { PrimaryAction } from "@/components/PrimaryAction";
import { OsmAttribution } from "@/components/OsmAttribution";
import { FoundIcon, SphinxMark } from "@/components/icons";
import { AgeGate } from "@/components/parent/AgeGate";
import { HuntReview } from "@/components/parent/HuntReview";
import { readAgeBand } from "@/lib/safety/consent";

type Step = "gate" | "ask" | "building" | "review" | "saved";

type BuildReport = {
  candidates: number;
  rejected: number;
  skipped: number;
  radiusMetres: number;
  attempts: number;
  partial: boolean;
  askedFor: number;
};

/**
 * The hunt builder.
 *
 * Flow is deliberately five steps with a mandatory review in the middle:
 *
 *   gate -> ask -> building -> REVIEW -> saved
 *
 * The gate asks the age band once per device and establishes that a grown-up is present. The review
 * step exists because of PROJECT_CONTEXT.md section 2.4: a grown-up sees every riddle in full before a
 * child walks to any of it. Memorials to war dead, graves and difficult history are part of this app,
 * and nobody should meet one for the first time halfway through a walk.
 *
 * The review UI is `HuntReview`, not an inline copy. There is exactly one review screen in this app,
 * because two of them would drift apart and only one of them would get fixed. The consent rule itself
 * lives in src/lib/safety/consent.ts and is re-checked at play time, so this screen is where consent is
 * granted rather than the only place it could be granted.
 *
 * Generation happens here, with a signal, once. After saving, the phone needs nothing.
 */
export function HuntBuilder() {
  // Start at the gate only if we have never asked. Read lazily in the initialiser rather than in an
  // effect so there is no render where the builder flashes before the gate appears.
  const [step, setStep] = useState<Step>(() => (readAgeBand() === null ? "gate" : "ask"));
  const [place, setPlace] = useState("");
  const [count, setCount] = useState(10);
  const [hunt, setHunt] = useState<HuntArtifact | null>(null);
  const [report, setReport] = useState<BuildReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedHunt | null>(null);
  const [existing, setExisting] = useState<SavedHunt[]>([]);

  useEffect(() => {
    listHunts()
      .then(setExisting)
      .catch(() => setExisting([]));
  }, []);

  async function build() {
    setStep("building");
    setError(null);
    try {
      const response = await fetch("/api/hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: place.trim(), count }),
      });
      const payload = (await response.json()) as { hunt?: HuntArtifact; report?: BuildReport; error?: string };

      if (!response.ok || !payload.hunt) {
        setError(payload.error ?? "Something went wrong building that walk.");
        setStep("ask");
        return;
      }
      setHunt(payload.hunt);
      setReport(payload.report ?? null);
      setStep("review");
    } catch {
      setError(
        "Could not reach the server. Building a walk needs a connection the first time - after " +
          "that it works with none at all.",
      );
      setStep("ask");
    }
  }

  async function save() {
    if (!hunt) return;
    const toSave: SavedHunt = { ...hunt, currentStop: 0 };
    try {
      await saveHunt(toSave);
      setSaved(toSave);
      setExisting((current) => [toSave, ...current.filter((h) => h.id !== toSave.id)]);
      setStep("saved");
    } catch (error) {
      setError(
        error instanceof Error
          ? `Could not save on this device: ${error.message}`
          : "Could not save this walk on the device.",
      );
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-paper px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Build a walk</h1>
        <a href="/" className="text-quiet text-ink-soft underline underline-offset-2">
          Home
        </a>
      </header>

      <div className="flex flex-1 flex-col gap-6 py-8">
        {step === "ask" && (
          <>
            <p className="max-w-sm text-ink-soft">
              Give a place. {app.name} finds real things mapped there, writes a riddle for each, and
              saves the whole walk to this device.
            </p>

            <label className="flex flex-col gap-2">
              <span className="text-quiet text-ink-soft">Place</span>
              <input
                value={place}
                onChange={(event) => setPlace(event.target.value)}
                placeholder="A town or city"
                inputMode="text"
                autoComplete="off"
                className="min-h-tap-primary rounded-2xl border-2 border-stone bg-paper-raised px-5 text-lg text-ink placeholder:text-ink-soft/60"
              />
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-quiet text-ink-soft">How many places</legend>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCount(value)}
                    aria-pressed={count === value}
                    className={`min-h-tap-min rounded-xl border-2 px-5 text-quiet transition-colors duration-150 ease-sphinx ${
                      count === value
                        ? "border-ink bg-ink text-paper"
                        : "border-stone text-ink-soft hover:bg-sand/60"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="rounded-xl border-2 border-wrong/40 bg-sand/50 p-3 text-sm text-ink">
                {error}
              </p>
            )}

            <p className="text-xs text-ink-soft">
              Needs a connection now, so it can fetch OpenStreetMap data. The walk itself needs none.
              A grown-up reviews every riddle before it starts.
            </p>
          </>
        )}

        {step === "building" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <SphinxMark className="size-10 text-stone" />
            <p className="text-lg text-ink-soft" aria-live="polite">
              Finding real places near {place || "here"}…
            </p>
            <p className="max-w-xs text-sm text-ink-soft">
              OpenStreetMap is volunteer-run, so this can take a moment.
            </p>
          </div>
        )}

        {step === "gate" && (
          <AgeGate
            onPassed={() => setStep("ask")}
            // The gate here has no hunt to review yet - it is only establishing the age band and that
            // a grown-up is present. Per-hunt consent is granted in HuntReview and enforced at play.
          />
        )}

        {step === "review" && hunt && (
          <>
            {report && (
              <p className="text-xs text-ink-soft">
                From {report.candidates} candidates. {report.skipped} were left out - mostly because
                OpenStreetMap does not record enough about them to write something a child could check.
                {report.partial
                  ? ` Only ${hunt.stops.length} of ${report.askedFor} could be written honestly, and we would rather hand you a shorter walk than pad it with riddles that say nothing.`
                  : ""}
              </p>
            )}
            {/* The one review screen in this app. */}
            <HuntReview hunt={hunt} onApproved={save} />
          </>
        )}

        {step === "saved" && saved && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <FoundIcon className="size-12 text-found" />
            <p className="text-xl font-medium text-ink">Saved on this device</p>
            <p className="max-w-xs text-ink-soft">
              {saved.stops.length} places in {saved.placeName}. Turn your signal off now - this walk
              works with none.
            </p>
          </div>
        )}

        {existing.length > 0 && step !== "saved" && (
          <section className="border-t border-sand pt-4">
            <h2 className="text-quiet text-ink-soft">Already on this device</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {existing.map((item) => (
                <li key={item.id}>
                  <a
                    href={`/play/${item.id}`}
                    className="flex min-h-tap-min items-center justify-between rounded-xl border-2 border-stone px-4 text-ink hover:bg-sand/60"
                  >
                    <span>{item.placeName}</span>
                    <span className="text-xs text-ink-soft">
                      {item.stops.length} places{item.finishedAt ? " · done" : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="flex flex-col gap-3">
        {step === "ask" && (
          <PrimaryAction onClick={build} tone={place.trim() ? "stone" : "quiet"}>
            {place.trim() ? `Build a walk around ${place.trim()}` : "Type a place first"}
          </PrimaryAction>
        )}
        {step === "review" && hunt && (
          // No primary action here on purpose: HuntReview owns the one action on this screen, and two
          // primary buttons on one screen is a decision a grown-up should not have to make.
          <button
            type="button"
            onClick={() => setStep("ask")}
            className="min-h-tap-min rounded-2xl border-2 border-stone px-6 text-quiet text-ink hover:bg-sand/60"
          >
            Start over
          </button>
        )}
        {step === "saved" && saved && (
          <PrimaryAction onClick={() => window.location.assign(`/play/${saved.id}`)}>
            Start walking
          </PrimaryAction>
        )}
        <OsmAttribution />
      </footer>
    </main>
  );
}