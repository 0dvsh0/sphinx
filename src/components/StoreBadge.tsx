/**
 * Store badges, drawn inline.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE ARE SVG AND NOT <img>
 * ---------------------------------------------------------------------------
 * The obvious way to ship a store badge is the vendor's PNG from their CDN. That would be a
 * third-party network request from a page whose entire claim is that nothing third-party is
 * contacted - `scripts/check-privacy.ts` fails the build on exactly that pattern, and
 * AGENTS.md forbids it in stronger terms.
 *
 * These are inline so there is no asset to fetch at all: no request, no cache entry, no CDN, and
 * the badge inherits the page's colours. The text is real DOM text, so it scales, translates and
 * is announced by a screen reader.
 *
 * These are NOT the vendors' trademarked badge artwork. They say the same thing in a plain
 * rectangle, which is deliberate - we are not shipping a licensed brand asset from a children's
 * app that has no store listing to point at.
 */

/** The two stores a parent will actually look for. */
export type Store = "apple" | "google";

const STORE_LABEL: Record<Store, string> = {
  apple: "App Store",
  google: "Google Play",
};

export function StoreBadge({
  store,
  href,
  className,
}: {
  store: Store;
  /**
   * Undefined renders a badge that cannot be activated. That is the state we ship in, because no
   * listing exists yet - see `distribution.hasStoreListings` in src/lib/config.ts. A badge that
   * looks tappable and leads nowhere is worse than one that says it is not ready.
   */
  href?: string;
  className?: string;
}) {
  const label = STORE_LABEL[store];

  const badge = (
    <>
      <rect
        width="180"
        height="54"
        rx="10"
        fill="currentColor"
        className={href ? "text-ink" : "text-stone"}
      />
      {/* Download glyph: a tray with an arrow dropping into it. Drawn, not iconified, so it has no
          dependency and no network cost. */}
      <g
        stroke={href ? "var(--color-paper)" : "var(--color-paper-raised)"}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M22 17v14m0 0-5.5-5.5M22 31l5.5-5.5" />
        <path d="M15 38h14" />
      </g>
      <text
        x="46"
        y="25"
        fontSize="15"
        fontWeight="600"
        fill={href ? "var(--color-paper)" : "var(--color-paper-raised)"}
      >
        {label}
      </text>
      <text
        x="46"
        y="40"
        fontSize="11"
        fill={href ? "var(--color-sand)" : "var(--color-paper-raised)"}
      >
        Sphinx
      </text>
    </>
  );

  const shared = "block h-auto w-full max-w-[180px]";

  if (!href) {
    return (
      <span
        className={`${shared} ${className ?? ""}`}
        // Announced as unavailable rather than simply omitted. The reason a badge is dead needs to
        // be perceivable, and the adjacent paragraph on the page is where it is explained in words.
        // Deliberately NOT focusable: it is a static graphic, not a control, and putting a
        // non-functional element in the tab order would be worse than leaving it out.
        aria-disabled="true"
      >
        <svg viewBox="0 0 180 54" role="img" aria-label={`${label} - not available yet`}>
          {badge}
        </svg>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      // noopener because target=_blank hands the opener to the destination otherwise.
      rel="noreferrer noopener"
      className={`${shared} rounded-[10px] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ink ${className ?? ""}`}
    >
      <svg viewBox="0 0 180 54" role="img" aria-label={`Get Sphinx on the ${label}`}>
        {badge}
      </svg>
    </a>
  );
}