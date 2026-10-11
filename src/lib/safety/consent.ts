/**
 * Adult consent, and the gates that depend on it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A LIBRARY AND NOT A COMPONENT
 * ---------------------------------------------------------------------------
 * Two reasons, and the second is the important one.
 *
 * First, it is shared. The age gate, the review screen and the parent panel all need to agree, and
 * three components each with their own copy of the rule is three places for the rule to be wrong.
 *
 * Second, and more seriously: **a safety rule that only exists in the UI does not exist.** The
 * consent decision here is a pure function, so `npm run check:safety` can assert it directly. A
 * consent gate that can only be verified by clicking through it is a consent gate nobody verifies.
 * That is the same reasoning as the phrase lint: it lives in a library precisely so that a test can
 * prove it rejects what it is supposed to reject.
 *
 * ---------------------------------------------------------------------------
 * WHAT CONSENT ACTUALLY MEANS HERE
 * ---------------------------------------------------------------------------
 * Not "this adult has seen this app". It is scoped to ONE hunt, recorded against that hunt's id,
 * and revocable. "I saw what my child was going to walk to, for this walk" is a real decision.
 * "I once agreed to a privacy policy" is not, and nobody should pretend otherwise.
 *
 * Everything here is localStorage. No consent record, no device id, no timestamp of first contact
 * leaves the device - see `npm run check:privacy`, which asserts there is no call site to send one.
 */

/** Why a gate exists, for the UI to label it and for tests to name it. */
export type GateReason = "under-12" | "no-consent-for-this-hunt" | "consent-revoked";

export type ConsentRecord = {
  /** Exactly the hunt that was reviewed. Consent is not transferable between hunts. */
  huntId: string;
  /** How many riddles the adult was shown, so a later screen can prove nothing was added. */
  stopsReviewed: number;
  /** ISO timestamp. Local only. */
  grantedAt: string;
};

export type GateDecision =
  | { allowed: true; record: ConsentRecord }
  | { allowed: false; reason: GateReason };

const CONSENT_KEY = "sphinx:consent";
const AGE_KEY = "sphinx:age-band";

/**
 * Age bands, not a date of birth.
 *
 * We do not want a birthday. A date of birth is a piece of identity we have no reason to hold, it
 * outlives the app, and it is the kind of field that gets exported somewhere six months later by a
 * well-meaning engineer. "under 12" is the only distinction any screen in this app actually needs,
 * because 12 is the threshold OSM-adjacent youth safety guidance and our own charter use.
 */
export type AgeBand = "under-12" | "12-or-over";

export const AGE_QUESTION = "How old is the person playing?";

/** LocalStorage access that never throws. Safari in private mode throws on setItem. */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAgeBand(): AgeBand | null {
  const raw = safeStorage()?.getItem(AGE_KEY);
  return raw === "under-12" || raw === "12-or-over" ? raw : null;
}

export function writeAgeBand(band: AgeBand): void {
  safeStorage()?.setItem(AGE_KEY, band);
}

/**
 * Every consent record, newest last. An array rather than a single object so revoking one hunt does
 * not silently revoke another, and so the parent panel can show "you agreed to 3 walks" honestly.
 */
export function readConsents(): ConsentRecord[] {
  const raw = safeStorage()?.getItem(CONSENT_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isConsentRecord);
  } catch {
    return [];
  }
}

function isConsentRecord(value: unknown): value is ConsentRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.huntId === "string" &&
    v.huntId.length > 0 &&
    typeof v.stopsReviewed === "number" &&
    typeof v.grantedAt === "string"
  );
}

export function recordConsent(huntId: string, stopsReviewed: number): ConsentRecord {
  const record: ConsentRecord = {
    huntId,
    stopsReviewed,
    grantedAt: new Date().toISOString(),
  };
  const all = readConsents().filter((r) => r.huntId !== huntId);
  all.push(record);
  safeStorage()?.setItem(CONSENT_KEY, JSON.stringify(all));
  return record;
}

/**
 * Revoke one hunt's consent. Returns true if there was something to revoke, so the panel can say
 * "that walk is locked again" rather than silently doing nothing and leaving the child to find out
 * at the wrong moment.
 */
export function revokeConsent(huntId: string): boolean {
  const all = readConsents();
  const remaining = all.filter((r) => r.huntId !== huntId);
  if (remaining.length === all.length) return false;
  safeStorage()?.setItem(CONSENT_KEY, JSON.stringify(remaining));
  return true;
}

/** Withdraw everything. The "we are done with this app" button. */
export function revokeAll(): number {
  const all = readConsents();
  safeStorage()?.removeItem(CONSENT_KEY);
  safeStorage()?.removeItem(AGE_KEY);
  return all.length;
}

/**
 * THE RULE.
 *
 * Pure, total, and takes its inputs as arguments. Everything the decision depends on is passed in,
 * which is what makes it assertable in a test rather than merely clickable in a browser.
 *
 * Two things this deliberately does NOT do:
 *
 *   - It does not accept an age band as "good enough". Under-12 always requires a per-hunt record,
 *     because "the child once said they were 12" is not a safety decision, it is a cached one.
 *   - It does not let a consent record cover a hunt with a different number of stops than the adult
 *     saw. If the hunt changed after review, the consent is stale and must be given again -
 *     otherwise the review screen is decorative, because nothing stops the hunt growing after the
 *     adult has read it.
 */
export function evaluateGate(input: {
  ageBand: AgeBand | null;
  huntId: string;
  stopsInHunt: number;
  consents: ConsentRecord[];
}): GateDecision {
  // Unknown age is treated as under-12. Defaulting to "allowed" for missing information is how
  // safety gates get bypassed in practice, one missing value at a time.
  const underTwelve = input.ageBand !== "12-or-over";

  const record = input.consents.find((r) => r.huntId === input.huntId);

  if (!record) {
    return { allowed: false, reason: underTwelve ? "under-12" : "no-consent-for-this-hunt" };
  }

  // The hunt changed after it was reviewed. Stale consent is not consent.
  if (record.stopsReviewed !== input.stopsInHunt) {
    return { allowed: false, reason: "consent-revoked" };
  }

  return { allowed: true, record };
}

/**
 * Human wording for a refusal.
 *
 * Written for a grown-up, not a child: the child never sees this text, because the child never gets
 * this far. A nine-year-old being told "consent-stale" learns that the app is broken.
 */
export function explainGate(decision: Extract<GateDecision, { allowed: false }>): string {
  switch (decision.reason) {
    case "under-12":
      return "Someone over 18 needs to read through this walk first.";
    case "no-consent-for-this-hunt":
      return "This walk has not been reviewed yet.";
    case "consent-revoked":
      return "This walk changed after it was reviewed, so it needs looking at again.";
  }
}

/**
 * Does anything leave the device when consent is recorded?
 *
 * No. This function exists to be imported by `npm run check:privacy`, which asserts that the consent
 * module has no network call site at all. Declaring "we don't send it" in a README is a promise;
 * asserting the module contains no fetch is a check.
 */
export const CONSENT_STAYS_LOCAL = true;
