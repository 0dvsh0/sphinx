/**
 * Server-only secrets.
 *
 * Nothing in this file may ever be imported by a client component. The photo check and location
 * handling depend on those staying on the device, and the privacy claim in PROJECT_CONTEXT.md §4
 * is only credible if a childs data has no path to a server we control.
 */

/**
 * Reading the Tinker key at request time (not module scope) keeps it out of any build-time
 * inlining and lets the app run with no key at all - which is the required demo path.
 */
export function tinkerApiKey(): string | undefined {
  return process.env.TINKER_API_KEY || undefined;
}

/**
 * The fine-tuned LoRA to use as the riddle writer.
 *
 * Undefined is the *normal* state: the template generator in
 * src/lib/riddles/template-fallback.ts is a complete, playable riddle writer on its own. Tinker is
 * an upgrade, never a dependency. See PROJECT_CONTEXT.md §5.
 */
export function riddleModelPath(): string | undefined {
  return process.env.SPHINX_RIDDLE_MODEL || undefined;
}

export function hasModel(): boolean {
  return Boolean(tinkerApiKey() && riddleModelPath());
}