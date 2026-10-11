"use client";

import { useEffect, useState } from "react";

/**
 * The real install path, for browsers that offer one.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS THE HONEST PRIMARY ACTION
 * ---------------------------------------------------------------------------
 * There is no store listing, so this button is the only way to actually get Sphinx onto a phone
 * that supports it. It is deliberately honest about when it cannot help:
 *
 *   - No `beforeinstallprompt` (Safari, Firefox, most desktop browsers) -> the button is NOT
 *     rendered. An install button that does nothing when tapped is a broken promise, and the manual
 *     steps on the page are the fallback for exactly those browsers.
 *   - Already installed -> the button is not rendered either.
 *
 * The event is captured on mount rather than on click. Chrome fires `beforeinstallprompt` early and
 * discards it if nothing prevents the default, so a listener attached at click time never sees it.
 *
 * Nothing here is a network request, which matters: this is the one component a visitor lands on
 * before deciding whether they trust the privacy claim underneath.
 */
export function InstallButton({ className }: { className?: string }) {
  const [promptEvent, setPromptEvent] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Without this the browser shows its own mini-infobar, which we would then be fighting.
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Nothing to offer on this browser. The manual steps on the landing page cover it, so rendering a
  // dead button here would only cost a tap and a little trust.
  if (installed || !promptEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        const event = promptEvent as Event & { prompt: () => Promise<void> };
        await event.prompt();
        // prompt() resolves once the user has answered. The choice is theirs either way, so this
        // is where the button stops being relevant.
        setPromptEvent(null);
      }}
      className={
        className ??
        "flex min-h-tap-primary w-full items-center justify-center rounded-2xl bg-stone-deep px-6 text-action text-paper transition-colors duration-150 ease-sphinx hover:bg-ink active:translate-y-px"
      }
    >
      Install on this device
    </button>
  );
}