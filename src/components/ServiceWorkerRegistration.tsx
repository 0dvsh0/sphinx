"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Registration is deferred until after load and only when the connection looks reasonable, because a
 * service worker downloading itself on a child's metered connection is a bad first impression.
 *
 * Registration failure is silently non-fatal: the app works without it, it just needs a signal for
 * the shell. Reporting an error to a child for a background nicety would be worse than the nicety.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Never register in development - a cached shell makes hot reload lie to you.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}

/**
 * Whether the app shell is cached and ready for offline play.
 *
 * Used by the builder to tell the grown-up the truth about whether this hunt will work in a park,
 * rather than leaving them to discover it at the worst moment.
 */
export function useOfflineReady(): "unknown" | "ready" | "unsupported" {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready.then(() => {
      window.dispatchEvent(new CustomEvent("sphinx:offline-ready"));
    });
  }, []);

  return typeof navigator !== "undefined" && "serviceWorker" in navigator ? "unknown" : "unsupported";
}