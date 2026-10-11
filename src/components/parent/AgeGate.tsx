"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { PrimaryAction } from "@/components/PrimaryAction";
import {
  AGE_QUESTION,
  explainGate,
  evaluateGate,
  readAgeBand,
  readConsents,
  recordConsent,
  writeAgeBand,
  type AgeBand,
  type GateDecision,
} from "@/lib/safety/consent";

/**
 * The age gate.
 *
 * "One tap, not a form" (PROJECT_CONTEXT.md section 2.2). Two questions because both are needed and
 * neither can be inferred:
 *
 *   1. How old is the person playing?  - decides whether review is mandatory at all.
 *   2. Is a grown-up here with you?    - the gate is about a human being present, not a checkbox.
 *
 * There is deliberately no name, no email, no date of birth and no "create an account". Everything
 * asked here is stored in localStorage and never leaves the device.
 *
 * The unknown-age case matters: `evaluateGate` treats a null age band as under-12, so skipping this
 * screen does not skip the review. Defaulting to "allowed" for missing information is how a safety
 * gate gets bypassed in practice, one missing value at a time.
 */
export function AgeGate({
  onPassed,
  /** Set when a hunt is waiting to be reviewed, so the copy can be specific. */
  huntId,
  stopsInHunt,
}: {
  onPassed?: (decision: GateDecision) => void;
  huntId?: string;
  stopsInHunt?: number;
}) {
  const [band, setBand] = useState<AgeBand | null>(null);
  const [grownUpPresent, setGrownUpPresent] = useState(false);

  // Read after mount so server and client render the same thing first.
  useEffect(() => setBand(readAgeBand()), []);

  // A hunt can already be consented to from a previous session. If so, nothing to ask.
  useEffect(() => {
    if (!huntId || stopsInHunt === undefined) return;
    const decision = evaluateGate({ ageBand: readAgeBand(), huntId, stopsInHunt, consents: readConsents() });
    if (decision.allowed) onPassed?.(decision);
  }, [huntId, stopsInHunt, onPassed]);

  const choose = useCallback(
    (next: AgeBand) => {
      setBand(next);
      writeAgeBand(next);
    },
    [],
  );

  const underTwelve = band !== "12-or-over";
  // Over-12s do not need a grown-up in the room, but they still cannot have a review nobody did.
  const canContinue = band !== null && (!underTwelve || grownUpPresent);

  return (
    <section
      aria-labelledby="age-gate-heading"
      className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-10"
    >
      <div>
        <h1 id="age-gate-heading" className="text-2xl font-semibold text-ink">
          Before you start
        </h1>
        <p className="mt-2 text-ink-soft">
          Sphinx is a walk around your neighbourhood. Two quick questions so we know how to set it up.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-ink">{AGE_QUESTION}</legend>
        <div className="flex gap-3">
          <BandButton selected={band === "under-12"} onClick={() => choose("under-12")}>
            Under 12
          </BandButton>
          <BandButton selected={band === "12-or-over"} onClick={() => choose("12-or-over")}>
            12 or over
          </BandButton>
        </div>
      </fieldset>

      {underTwelve ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-ink">Is a grown-up with you?</legend>
          <div className="flex gap-3">
            <BandButton selected={grownUpPresent} onClick={() => setGrownUpPresent(true)}>
              Yes, they are
            </BandButton>
            <BandButton selected={!grownUpPresent && band !== null} onClick={() => setGrownUpPresent(false)}>
              Not right now
            </BandButton>
          </div>
        </fieldset>
      ) : null}

      {/* The consequence is stated before the tap, not discovered after it. */}
      {underTwelve && band !== null ? (
        <p className="rounded-xl border border-sand bg-paper-raised px-4 py-3 text-ink-soft">
          {grownUpPresent
            ? "That grown-up will see every riddle on this walk before it starts."
            : "Then this walk cannot start yet. Ask a grown-up to come and look at it with you."}
        </p>
      ) : null}

      <PrimaryAction
        onClick={() => {
          if (!band || !canContinue) return;
          // No hunt id means there is nothing to review yet, so passing here only records the age.
          if (huntId && stopsInHunt !== undefined) {
            recordConsent(huntId, stopsInHunt);
          }
          onPassed?.({ allowed: true, record: readConsents().find((r) => r.huntId === huntId) ?? {
            huntId: huntId ?? "",
            stopsReviewed: stopsInHunt ?? 0,
            grantedAt: new Date().toISOString(),
          } });
        }}
        disabled={!canContinue}
      >
        {underTwelve ? "Grown-up has seen this walk" : "Start the walk"}
      </PrimaryAction>

      {/* Keyboard and switch users get a real button, not a styled div. */}
      <p className="text-xs text-ink-soft">
        Nothing you enter here is sent anywhere. It stays in this browser.
      </p>
    </section>
  );
}

function BandButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-tap-min flex-1 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ease-sphinx",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-stone bg-transparent text-ink hover:bg-sand/60",
      )}
    >
      {/* A tick as well as a colour change: never signal state with colour alone. */}
      <span aria-hidden className="mr-2 inline-block">
        {selected ? "✓" : " "}
      </span>
      {children}
    </button>
  );
}
