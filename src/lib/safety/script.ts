/**
 * The stranger-safety script, and the sharing text that goes with it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS DATA
 * ---------------------------------------------------------------------------
 * Because the single most important sentence in this app is a sentence, and a sentence written
 * inside a JSX component is a sentence that can be truncated, refactored, "tidied up", or lost in a
 * rewrite. PROJECT_CONTEXT.md section 2.3 calls this an exploitable lure and requires the script
 * verbatim.
 *
 * So: it lives here, `npm run check:safety` asserts the exact string is present, and the component
 * that displays it does not own any of the wording. If someone deletes a clause, a check fails.
 *
 * ---------------------------------------------------------------------------
 * THE THREAT THIS ADDRESSES
 * ---------------------------------------------------------------------------
 * This is a game that tells children to go and photograph public objects, and that encourages them
 * to tell an adult something is wrong with the map. Both behaviours are the point of the product and
 * both create a pattern a stranger could imitate:
 *
 *   "I'm helping with the Sphinx game, come and look at this statue."
 *
 * The script has to be usable by a child under stress, so it is short, it is in the child's voice,
 * and the instruction is unconditional: no matter what the stranger says, go back to your own
 * grown-up. A script with a conditional ("unless they seem official") is a script a child will
 * interpret in the one situation where it matters most.
 */

/**
 * THE VERBATIM SCRIPT.
 *
 * Treat this string as frozen. It is asserted in check-safety.ts. If it needs to change, change it
 * deliberately there too.
 */
export const STRANGER_SCRIPT =
  "Only play with someone whose grown-up you already know. " +
  "No matter what a stranger tells you, get back to your own grown-up and tell them.";

/** Short label for where this appears. Also asserted, so it cannot quietly disappear. */
export const STRANGER_SCRIPT_LABEL = "If anyone asks you about this game";

/**
 * Why the wording is what it is, for the parent panel's "why" disclosure.
 *
 * A parent who thinks this is paranoid will override it, so the reasoning is one tap away rather
 * than hidden. That is the difference between a safety feature and a safety nag.
 */
export const STRANGER_SCRIPT_RATIONALE =
  "Sphinx asks children to go and look at things in public, and to tell an adult when something " +
  "looks wrong. A stranger could copy that pattern to get a child to come with them. The rule is " +
  "written without exceptions on purpose: a rule with an 'unless' in it gets read the wrong way by " +
  "a nine-year-old under pressure.";

/**
 * Know Your Location. Optional, off by default, explicit.
 *
 * "Explicit" is doing real work in that sentence. A dead-man switch that is on by default is a
 * tracker; a tracker for children is not a safety feature. It is off until a grown-up turns it on,
 * and turning it on is one deliberate tap in the parent panel.
 *
 * This describes what sharing WOULD do, for the disclosure a grown-up reads before switching it on.
 */
export const KYL_DISCLOSURE =
  "Know Your Location is off. If you turn it on, the walk's start point and a button are shared " +
  "with a grown-up you choose. Nothing is sent until you press the button, and no photos, " +
  "riddles or answers are ever included.";

/** What a grown-up needs to know about the reveal, which is the educational payload. */
export const REVEAL_RATIONALE =
  "Every stop ends with a real fact about a real place, from OpenStreetMap. There is no score and " +
  "no winner. The reward is knowing something true about where you live.";

/**
 * The one line that must not be softened.
 *
 * A child who cannot find something has found a map error, and that is a good outcome worth saying
 * out loud. Phrasing it as a score loss teaches a child that being wrong is bad, which is the
 * opposite of what this app is for. Referenced from ReportGone so the phrasing cannot drift between
 * components.
 */
export const MAP_ERROR_LINE = "You found something the map got wrong.";
