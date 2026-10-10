"use client";

import { useState } from "react";
import type { HuntStop } from "@/lib/riddle";
import {
  REPORT_GONE_BODY,
  REPORT_GONE_TITLE,
  canReportGone,
  draftNote,
} from "@/lib/notes/draft";
import { PrimaryAction } from "@/components/PrimaryAction";
import { FoundIcon } from "@/components/icons";

/**
 * "It's gone" — the twist, and the best thing in the app.
 *
 * ---------------------------------------------------------------------------
 * THE FRAMING IS THE FEATURE
 * ---------------------------------------------------------------------------
 * A child walks to a drinking fountain that OpenStreetMap says exists, and it is not there. Tap
 * "It's gone" and the app says:
 *
 *   "You found something the map got wrong."
 *
 * Not "wrong answer". Not "try again". The child has just done something genuinely valuable — they
 * noticed a map was out of date, and they can put it right. That reframing is the entire product
 * (PROJECT_CONTEXT.md section 2.5), and every word below exists to protect it.
 *
 * ---------------------------------------------------------------------------
 * NOTHING IS SENT WITHOUT A PERSON SAYING SO
 * ---------------------------------------------------------------------------
 * OpenStreetMap's own rule: "Don't create automated notes. Notes should be a human-to-human
 * communication." So this shows the exact text, requires an adult to confirm, and never posts on a
 * timer or in the background. The button that sends is not the button that opens this.
 */
export function ReportGone({
  stop,
  placeName,
  onDone,
}: {
  stop: HuntStop;
  placeName: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"draft" | "sent" | "failed">("draft");
  const [withProvenance, setWithProvenance] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteUrl, setNoteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const draft = draftNote(stop, { withProvenance });

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop: {
            id: stop.id,
            name: stop.name,
            category: stop.category,
            lat: stop.lat,
            lon: stop.lon,
          },
          withProvenance,
          // Set only because a grown-up pressed the button below, having read the text.
          humanConfirmed: true,
        }),
      });
      const payload = (await response.json()) as { error?: string; viewUrl?: string };

      if (!response.ok) {
        setError(payload.error ?? "Something went wrong. Nothing was sent.");
        setStep("failed");
        return;
      }
      setNoteUrl(payload.viewUrl ?? null);
      setStep("sent");
    } catch {
      setError(
        "Could not reach the server. Remember that Sphinx needs a connection the first time it " +
          "talks to OpenStreetMap — the walk itself does not. Nothing was sent.",
      );
      setStep("failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canReportGone(stop)) {
    return null;
  }

  if (step === "sent") {
    return (
      <main className="flex min-h-dvh flex-col bg-paper px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <FoundIcon className="size-12 text-found" />
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Sent to OpenStreetMap</h1>
          <p className="max-w-xs text-ink-soft">
            A real person will read it, and if they agree, the map gets fixed. That is how
            OpenStreetMap works — people telling other people.
          </p>
        </div>
        <footer className="flex flex-col gap-3">
          {noteUrl && (
            <a
              href={noteUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex min-h-tap-min items-center justify-center rounded-2xl border-2 border-stone px-6 text-quiet text-ink hover:bg-sand/60"
            >
              Grown-ups: see the note
            </a>
          )}
          <PrimaryAction onClick={onDone}>Carry on</PrimaryAction>
        </footer>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-paper px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header>
        <p className="text-quiet text-ink-soft">{placeName}</p>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-5 py-6">
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance text-ink">
            {REPORT_GONE_TITLE}
          </h1>
          <p className="mt-2 text-ink-soft">{REPORT_GONE_BODY}</p>
        </div>

        {/*
          The exact text, shown before anything is sent. This is not a preview for politeness - it
          is the mechanism: the rule is that a person reads the words and agrees to them. A mapper
          reading a precise, polite note is far more likely to act on it, which is also the reason
          this is better for the child - their report actually gets fixed.
        */}
        <div className="rounded-2xl border-2 border-stone bg-paper-raised p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            What will be sent
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{draft.text}</p>
        </div>

        <label className="flex min-h-tap-min items-start gap-3 rounded-xl px-1 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={withProvenance}
            onChange={(event) => setWithProvenance(event.target.checked)}
            className="mt-1 size-5 shrink-0 accent-[color:var(--color-stone-deep)]"
          />
          <span>
            Say it came from Sphinx. Mappers prefer to know how a report was made, and hiding it
            would be the wrong thing to do with a community we depend on.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl border-2 border-wrong/40 bg-sand/50 p-3 text-sm text-ink">
            {error}
          </p>
        )}

        <p className="text-xs text-ink-soft">
          OpenStreetMap only wants notes about map data — not about anything else. We only ever send
          this one, only when you press the button, and only once.
        </p>
      </section>

      <footer className="flex flex-col gap-3">
        <PrimaryAction onClick={send} tone={busy ? "quiet" : "stone"}>
          {busy ? "Sending…" : step === "failed" ? "Try sending again" : "Grown-ups: send this note"}
        </PrimaryAction>
        <button
          type="button"
          onClick={onDone}
          className="min-h-tap-min rounded-2xl border-2 border-stone px-6 text-quiet text-ink transition-colors duration-150 ease-sphinx hover:bg-sand/60"
        >
          Don't send anything
        </button>
      </footer>
    </main>
  );
}

/**
 * The entry point on the arrival screen.
 *
 * Kept quiet and last. It must never compete with "Yes, I found it", because the overwhelmingly
 * common outcome is that the child DID find the thing, and a prominent "report a problem" button
 * would be an invitation to file notes about a game they are simply bad at.
 */
export function ReportGoneLink({ stop, onOpen }: { stop: HuntStop; onOpen: () => void }) {
  if (!canReportGone(stop)) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="min-h-tap-min w-full rounded-2xl px-4 py-2 text-center text-sm text-ink-soft underline underline-offset-4 transition-colors duration-150 ease-sphinx hover:text-ink"
    >
      There is nothing here
    </button>
  );
}