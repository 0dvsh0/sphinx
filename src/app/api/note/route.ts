import { NextResponse } from "next/server";
import { userAgent, hasRealContact, osmNotes } from "@/lib/config";
import { draftNote } from "@/lib/notes/draft";
import type { HuntStop } from "@/lib/riddle";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ status: "static-export" });
}

/**
 * Files an OpenStreetMap Note on a child's behalf - after a person has read and agreed to it.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ THIS ROUTE DOES NOT AUTO-POST. NOTHING EVER CALLS IT WITHOUT A HUMAN CONFIRMING.
 * ---------------------------------------------------------------------------
 * OSM's wiki, verbatim:
 *   "Don't create automated notes. Notes should be a human-to-human communication."
 *   "this functionality is intended for humans to communicate with other humans (mappers). It is not
 *    a place to dump automated error checking."
 *
 * So the client shows the exact text, a grown-up confirms, and only then does this run. There is no
 * batch endpoint, no queue, and no scheduled path. If you are reading this to add one, don't.
 *
 * ---------------------------------------------------------------------------
 * THE ENDPOINT CHANGED AND MOST TUTORIALS ARE WRONG
 * ---------------------------------------------------------------------------
 *   POST /api/0.6/notes/create   ->  404. Dead. Dec 2024 - Mar 2025 REST alignment.
 *   POST /api/0.6/notes          ->  correct.
 *
 * Verified live on 2026-10-08. See docs/research/osm-data.md.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO PHOTO SUPPORT. NONE.
 * ---------------------------------------------------------------------------
 * The Notes API accepts exactly three parameters - lat, lon, text. There is no image field in
 * `POST /notes` and no attachment mechanism anywhere in note or comment XML. Photo upload exists
 * only in the openstreetmap.org web UI. So the note cannot carry the child's photo, and the UI must
 * not pretend otherwise. `https://www.openstreetmap.org/fixthemap` is the only route if a photo is
 * wanted, and that is a link for a grown-up to use, not something we automate.
 */

const MAX_TEXT = osmNotes.maxTextLength;
const MIN_TEXT = osmNotes.minTextLength;

/**
 * In-memory rate limit, per instance.
 *
 * Not a security control - OSM does the real rate limiting and will 429 us - but a cheap guard so a
 * child mashing the button cannot fire a burst of notes at volunteer infrastructure. Notes are
 * human communication, and a burst is not that.
 */
const recent = new Map<string, number>();
const WINDOW_MS = osmNotes.windowMs;
const MAX_PER_WINDOW = osmNotes.maxPerWindow;

function rateLimited(key: string): boolean {
  const now = Date.now();
  // Drop anything outside the window first, so the map cannot grow without bound.
  for (const [k, t] of recent) {
    if (now - t >= WINDOW_MS) recent.delete(k);
  }

  const count = [...recent.entries()].filter(([k]) => k.startsWith(`${key}#`)).length;
  if (count >= MAX_PER_WINDOW) return true;

  recent.set(`${key}#${now}`, now);
  return false;
}

type RequestBody = {
  stop?: HuntStop;
  /** If false, the provenance line is omitted. Defaults to true. */
  withProvenance?: boolean;
  /**
   * Must be true. Sent by the client only after a grown-up has confirmed the exact text on screen.
   * Server-side because a client flag is a suggestion, and this is the one place where the OSM
   * policy is being complied with.
   */
  humanConfirmed?: boolean;
};

export async function POST(request: Request) {
  if (!hasRealContact) {
    return NextResponse.json(
      {
        error:
          "Sphinx is not configured with a contact address, so it will not file notes. Set " +
          "SPHINX_CONTACT_URL and SPHINX_CONTACT_EMAIL. OpenStreetMap requires a real User-Agent and " +
          "will refuse requests without one.",
      },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (body.humanConfirmed !== true) {
    return NextResponse.json(
      { error: "A note is only filed after a person has read and agreed to the text." },
      { status: 400 },
    );
  }

  const stop = body.stop;
  if (!stop || typeof stop.lat !== "number" || typeof stop.lon !== "number") {
    return NextResponse.json({ error: "A stop with a position is required." }, { status: 400 });
  }
  if (Math.abs(stop.lat) > 90 || Math.abs(stop.lon) > 180) {
    return NextResponse.json({ error: "That is not a position on Earth." }, { status: 400 });
  }

  const draft = draftNote(stop, { withProvenance: body.withProvenance ?? true });

  if (draft.text.length < MIN_TEXT) {
    return NextResponse.json({ error: "That note is too short to be useful." }, { status: 400 });
  }
  if (draft.text.length > MAX_TEXT) {
    return NextResponse.json({ error: "That note is too long." }, { status: 400 });
  }

  const rateKey = `${Math.round(stop.lat * 100)}:${Math.round(stop.lon * 100)}`;
  if (rateLimited(rateKey)) {
    return NextResponse.json(
      {
        error:
          "You have already sent a few notes from around here. OpenStreetMap asks people not to " +
          "repeat the same thing, so we are giving it a rest.",
      },
      { status: 429 },
    );
  }

  try {
    const response = await fetch(osmNotes.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // OpenStreetMap asks for an identifying User-Agent and rates by it.
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      // Exactly the three parameters the Notes API accepts. There is no photo field - see the note
      // at the top of this file.
      body: JSON.stringify({ lat: draft.lat, lon: draft.lon, text: draft.text }),
      cache: "no-store",
    });

    // 403 here means the position is inside a Moderation Zone and we are not authenticated.
    // New behaviour since May 2026, and worth explaining rather than showing a bare error.
    if (response.status === 403) {
      return NextResponse.json(
        {
          error:
            "OpenStreetMap will not accept an anonymous note for this spot. Someone has marked " +
            "this area as needing a signed-in account. You can still add it yourself at " +
            osmNotes.fixTheMap,
          moderationZone: true,
        },
        { status: 502 },
      );
    }

    if (response.status === 429 || response.status === 410) {
      return NextResponse.json(
        { error: "OpenStreetMap is asking us to slow down. Try again in a few minutes." },
        { status: 502 },
      );
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return NextResponse.json(
        { error: `OpenStreetMap returned ${response.status}.`, detail },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as { id?: number; lon?: number; lat?: number };

    return NextResponse.json({
      ok: true,
      noteId: payload.id ?? null,
      text: draft.text,
      /** Where it can be seen. A grown-up can follow this and watch the map get fixed. */
      viewUrl: payload.id
        ? `https://www.openstreetmap.org/note/${payload.id}`
        : "https://www.openstreetmap.org/notes",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Could not reach OpenStreetMap: ${
          error instanceof Error ? error.message : "unknown error"
        }. Nothing was sent, so it is safe to try again.`,
      },
      { status: 502 },
    );
  }
}