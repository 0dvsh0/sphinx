/**
 * Design tokens as data.
 *
 * This is the single source of truth. `src/app/globals.css` mirrors these values into Tailwind's
 * `@theme`, and `scripts/audit-contrast.ts` reads them from here to check contrast.
 *
 * Why the duplication exists: CSS custom properties cannot be imported into a Tailwind v4 `@theme`
 * block, and `@theme` cannot be read by a Node script. So the values live here, CSS mirrors them,
 * and the audit script FAILS if the two drift apart. Never edit a value in only one place.
 *
 * Colour reasoning is in docs/design/kids-ui-charter.md §6. The short version: this interface is
 * read outdoors on a cheap phone, in daylight, by a nine-year-old, and washed-out contrast is the
 * failure mode we are designing against.
 */

/** Warm paper instead of pure white: less glare in daylight, easier on the eye. */
export const color = {
  paper: "oklch(0.97 0.008 85)",
  paperRaised: "oklch(0.99 0.005 85)",
  ink: "oklch(0.22 0.02 260)",
  inkSoft: "oklch(0.45 0.015 260)",
  stone: "oklch(0.55 0.03 75)",
  stoneDeep: "oklch(0.38 0.035 70)",
  sand: "oklch(0.9 0.03 80)",

  /** Verdict states. Always paired with text AND a distinct icon shape - never colour alone. */
  found: "oklch(0.42 0.09 150)",
  unsure: "oklch(0.45 0.06 250)",
  wrong: "oklch(0.48 0.1 25)",

  /**
   * Pocket mode. Near-black rather than black: on an OLED panel this is very close to an
   * actually-dark screen, which matters because the whole point is that a child walking around at
   * dusk is not holding a glowing rectangle. We cannot control device brightness from a web page
   * (the Screen Wake Lock API only keeps a screen ON), so this is the honest approximation.
   */
  pocket: "oklch(0.14 0.008 260)",
  pocketInk: "oklch(0.62 0.01 260)",
} as const;

export type ColorToken = keyof typeof color;

/**
 * Pairs that must stay readable, with the bar each one has to clear.
 *
 * `min` is WCAG contrast on an undamaged screen.
 * `minWashed` is the same pair after simulated outdoor glare (see GLARE_FACTOR). Our real-world
 * target is not a passing accessibility checker in a dark room.
 */
export const contrastPairs: {
  label: string;
  fg: ColorToken;
  bg: ColorToken;
  min: number;
  minWashed: number;
  note: string;
}[] = [
  {
    label: "Riddle text on paper",
    fg: "ink",
    bg: "paper",
    min: 7,
    minWashed: 3.8,
    note: "The hero content. 7:1 raw so it survives daylight glare with room to spare.",
  },
  {
    label: "Riddle text on raised card",
    fg: "ink",
    bg: "paperRaised",
    min: 7,
    minWashed: 3.8,
    note: "Same, when the riddle sits on a card.",
  },
  {
    label: "Secondary text on paper",
    fg: "inkSoft",
    bg: "paper",
    min: 4.5,
    minWashed: 2.6,
    note: "Progress count, hints. Legible but clearly subordinate.",
  },
  {
    label: "Primary button label",
    fg: "paper",
    bg: "stoneDeep",
    min: 7,
    minWashed: 3.8,
    note: "The one action per screen. Highest stakes, highest bar.",
  },
  {
    label: "Found state",
    fg: "found",
    bg: "paper",
    min: 4.5,
    minWashed: 2.6,
    note: "Never the sole signal - always paired with text and an icon.",
  },
  {
    label: "Unsure state",
    fg: "unsure",
    bg: "paper",
    min: 4.5,
    minWashed: 2.6,
    note: "'I can't tell' is a first-class outcome, not an error path.",
  },
  {
    label: "Wrong state",
    fg: "wrong",
    bg: "paper",
    min: 4.5,
    minWashed: 2.6,
    note: "Never a loud red. A child who is wrong should not feel punished.",
  },
  {
    label: "Pocket mode prompt",
    fg: "pocketInk",
    bg: "pocket",
    min: 4.5,
    minWashed: 2.4,
    note: "Must still be findable in the dark - a child taps without reading carefully.",
  },
];

/**
 * Outdoor glare model.
 *
 * There is no defensible universal number for sunlight washout - it depends on the panel, the
 * brightness setting and the angle. This is a conservative round figure for a mid-range phone at
 * moderate brightness, applied as a simple multiplicative loss of apparent contrast. It is a
 * heuristic, not a measurement, and it is only ever used to make the palette more conservative.
 */
export const GLARE_FACTOR = 0.55;

/** WCAG 2.1 minimum for body text, and the enhanced (AAA) level. */
export const WCAG_AA = 4.5;
export const WCAG_AAA = 7;

/**
 * Type scale. Deliberately short - this interface has almost no text.
 *
 * `riddle` is the hero. It is set large with generous line height because it is read at arm's
 * length, one-handed, possibly while walking.
 */
export const type = {
  riddle: { size: "1.75rem", lineHeight: "1.45", weight: 600, tracking: "0.005em" },
  revealFact: { size: "1.25rem", lineHeight: "1.6", weight: 500, tracking: "0" },
  action: { size: "1.125rem", lineHeight: "1.2", weight: 600, tracking: "0.01em" },
  quiet: { size: "0.875rem", lineHeight: "1.4", weight: 500, tracking: "0.01em" },
} as const;

/**
 * Touch targets. 44px is the WCAG 2.5.5 floor; 56px is our primary-action size because a
 * nine-year-old's aim is worse than an adult's and the primary action is the one that must land.
 */
export const target = {
  min: "44px",
  primary: "56px",
} as const;

/**
 * Motion. Charter §9: transitions are opacity and position only, no scale, no bounce, no spin.
 * 150ms ease-out is long enough to read as intentional and short enough not to delay a child.
 */
export const motion = {
  duration: "150ms",
  easing: "cubic-bezier(0, 0, 0.2, 1)",
} as const;

/**
 * Pocket mode. The anti-engagement default: after this long with no interaction, the screen goes
 * near-dark so a child is not walking around staring at it.
 *
 * 20s, not 10s. A nine-year-old needs roughly 10-15 seconds to read two short lines, and a pocket
 * screen that fires while they are mid-word feels hostile rather than clever. Any interaction
 * resets the timer. Twenty seconds is still shorter than any social app's idle timeout, which is
 * the whole point.
 */
export const pocketModeDelayMs = 20_000;