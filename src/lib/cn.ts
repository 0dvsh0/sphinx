/** Conditional className join. Tiny on purpose - this is not a styling library. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}