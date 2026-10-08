/**
 * Verdict state icons.
 *
 * These exist because of a rule in the design charter: a state is never signalled by colour alone.
 * Roughly 1 in 12 boys has some colour vision deficiency, and more to the point, a phone screen in
 * daylight washes out colour entirely. Every state carries an icon SHAPE and adjacent text.
 *
 * All are `aria-hidden` - the adjacent text is the accessible name, so announcing the icon too
 * would just be noise.
 */

type IconProps = { className?: string };

export function FoundIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {/* Tick inside a circle - closed, positive shape. */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="m7.5 12.5 3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UnsureIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {/* Question mark in a circle - open, inviting shape. This is a real outcome, not a failure. */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function WrongIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {/* Cross with no enclosing circle - deliberately softer than the others. */}
      <path
        d="M7 7l10 10M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SphinxMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3c-3.3 0-6 2.1-6 5 0 1.6.7 3 1.9 4-1.3.7-2 1.9-2 3.2V18a1 1 0 0 0 1 1h1.6v-3.5a1.4 1.4 0 0 1 1.4-1.4h4.2a1.4 1.4 0 0 1 1.4 1.4V19h1.6a1 1 0 0 0 1-1v-2.8c0-1.3-.7-2.5-2-3.2 1.2-1 1.9-2.4 1.9-4 0-2.9-2.7-5-6-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}