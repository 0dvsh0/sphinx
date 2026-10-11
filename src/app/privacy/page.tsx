import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What Sphinx sends",
  description: "Exactly what leaves this device, and what never does.",
};

/**
 * /privacy.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS PAGE IS A ROUTE AND NOT A MODAL
 * ---------------------------------------------------------------------------
 * Because it has to be linkable, quotable and checkable. A privacy statement a child has to find
 * inside a settings screen has not really been published.
 *
 * It is also not decorative. Every claim on this page corresponds to an assertion in
 * `npm run check:privacy`, which inspects the call sites rather than the prose. A claim here that
 * stopped being true would break a check, not just become a lie nobody notices.
 *
 * ---------------------------------------------------------------------------
 * WHAT ACTUALLY LEAVES THE DEVICE
 * ---------------------------------------------------------------------------
 * Two things, both from the grown-up building a hunt, both from the server rather than the phone:
 *
 *   1. A place name, to Nominatim, to turn "Bristol" into coordinates.
 *   2. A bounding box, to Overpass, to list what is in it.
 *
 * That is the entire list. It happens on the server. The child's phone sends nothing at all: no
 * coordinates, no photos, no riddle answers, no device identifier, no analytics, no third-party
 * scripts, no fonts, no telemetry. No CDN, because a CDN is a third party who learns who is
 * playing and from where.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link href="/" className="min-h-tap-min inline-flex items-center text-ink-soft underline underline-offset-4">
        Back
      </Link>

      <h1 className="mt-6 text-3xl font-semibold text-ink">What leaves this device</h1>

      <p className="mt-4 text-ink">
        Nothing from the child&apos;s phone. Ever. There is no account, no sign-in, and no identifier of
        any kind.
      </p>

      <h2 className="mt-8 font-medium text-ink">The only two requests Sphinx makes</h2>
      <p className="mt-2 text-ink-soft">
        Both happen when a grown-up builds a walk, and both go from our server to a public service. A
        child playing a saved walk makes no requests at all - that is what the offline mode is for.
      </p>

      <ol className="mt-4 flex flex-col gap-4">
        <li className="rounded-xl border border-sand bg-paper-raised px-4 py-4">
          <p className="font-medium text-ink">A place name</p>
          <p className="mt-1 text-ink-soft">
            Sent to Nominatim to turn &ldquo;Bristol&rdquo; into coordinates. Needed because that is how
            you ask a map what is in a place.
          </p>
        </li>
        <li className="rounded-xl border border-sand bg-paper-raised px-4 py-4">
          <p className="font-medium text-ink">A bounding box</p>
          <p className="mt-1 text-ink-soft">
            Sent to Overpass to list the things inside it. Needed for the same reason.
          </p>
        </li>
      </ol>

      <h2 className="mt-8 font-medium text-ink">Never sent, from the phone</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {[
          "Photos. The photo check happens on the device; the image is never uploaded and never stored.",
          "Location. Used to tell a grown-up where the walk started, on the device, and never transmitted unless you turn on Know Your Location and press the button.",
          "Riddles and answers.",
          "Your name, age, birthday, email or phone number. We ask for an age band and store it in your browser.",
          "Analytics or telemetry. There is none.",
          "Anything to a third-party CDN. Fonts, scripts and models are all served from this origin, because a CDN is someone else learning who is playing.",
        ].map((item) => (
          <li key={item} className="flex gap-2 text-ink-soft">
            <span aria-hidden className="text-ink">
              ✕
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-medium text-ink">Why that matters more than usual here</h2>
      <p className="mt-2 text-ink-soft">
        This app is for children. A photograph of a child standing at a memorial, or a history of where
        they walk after school, is a record of a child&apos;s movements. Keeping it on the device is not a
        feature we added for convenience - it is the design. There is no server-side copy to leak, subpoena
        or breach.
      </p>

      <h2 className="mt-8 font-medium text-ink">OpenStreetMap</h2>
      <p className="mt-2 text-ink-soft">
        Map data is © OpenStreetMap contributors, available under the Open Database License. Sphinx is
        not affiliated with the OpenStreetMap Foundation.
      </p>

      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/parent" className="min-h-tap-min inline-flex underline underline-offset-4">
          Grown-ups
        </Link>
      </p>
    </main>
  );
}
