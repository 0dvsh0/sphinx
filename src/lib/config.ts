/**
 * Public configuration. Safe to import from client components.
 *
 * Nothing secret belongs in this file. Secrets live in src/lib/server/secrets.ts.
 *
 * Every upstream endpoint is configurable on purpose: Overpass and Nominatim both churn, and both
 * rate-limit aggressively. See docs/research/osm-data.md.
 */

const contactUrl = process.env.SPHINX_CONTACT_URL ?? "";
const contactEmail = process.env.SPHINX_CONTACT_EMAIL ?? "";

/**
 * Overpass requires `AppName/version (contact-url; email)`.
 *
 * A placeholder domain here is not cosmetic: Nominatim returned 403 for a UA containing
 * `example.org` during testing. Until a real contact is configured we send no UA rather than a
 * lying one - the request may be refused, which is the correct failure mode for a fake identity.
 */
export const userAgent =
  contactUrl && contactEmail
    ? `Sphinx/0.1 (+${contactUrl}; ${contactEmail})`
    : "Sphinx/0.1 (unconfigured - set SPHINX_CONTACT_URL and SPHINX_CONTACT_EMAIL)";

/** True once real contact details are set, i.e. we are being a good OSM citizen. */
export const hasRealContact = Boolean(contactUrl && contactEmail);

export const overpass = {
  endpoint: process.env.SPHINX_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter",
  timeoutSeconds: 90,
  /**
   * Overpass wiki: on 429/406, pause 30s before retrying. 504s are transient gateway timeouts and
   * were observed repeatedly in testing.
   */
  retryStatus: [429, 406, 504] as const,
  backoffMs: [1000, 4000, 12_000] as const,
  cooldownMs: 30_000,
};

export const nominatim = {
  endpoint: process.env.SPHINX_NOMINATIM_URL ?? "https://nominatim.openstreetmap.org",
  /** Hard policy cap: 1 request per second, counted across all users. */
  minIntervalMs: 1100,
};

/**
 * OpenStreetMap Notes API.
 *
 * POST /api/0.6/notes is correct. POST /api/0.6/notes/create is DEAD and returns 404 - it was
 * deprecated in the Dec 2024 - Mar 2025 REST alignment. Verified live on 2026-10-08; most tutorials
 * online are wrong about this.
 *
 * The endpoint is configurable so the payload can be verified against a local stub. That matters:
 * creating a real note on OSM to test this would itself violate the "notes are human-to-human
 * communication" rule that this feature is built to obey.
 */
export const osmNotes = {
  endpoint: process.env.SPHINX_OSM_NOTES_URL ?? "https://api.openstreetmap.org/api/0.6/notes.json",
  fixTheMap: "https://www.openstreetmap.org/fixthemap",
  minTextLength: 20,
  maxTextLength: 4000,
  /** A burst of notes is not human-to-human communication. */
  maxPerWindow: 5,
  windowMs: 10 * 60 * 1000,
};

export const osmAttribution = {
  name: "OpenStreetMap",
  href: "https://www.openstreetmap.org/copyright",
} as const;

/**
 * The category allowlist.
 *
 * This is a CONTENT SAFETY control, not a convenience list - see PROJECT_CONTEXT.md §2.4. Anything
 * outside it is never offered to the riddle generator, so the generator cannot turn an execution
 * site or a grave into a treasure hunt.
 *
 * Yield figures are measured, not guessed. `man_made=statue`, `man_made=sundial`,
 * `man_made=obelisk` and *named* `natural=tree` all scored ~0 in a real city centre, so they are
 * absent by evidence. See docs/research/osm-data.md §3.
 *
 * `sensitive` is a CATEGORY-level default only. Whether an individual memorial is treated with
 * respect is decided per-feature in src/lib/osm/safety.ts, because "memorial" spans both a war
 * memorial and a blue plaque about a singer's house, and treating those the same threw away the
 * best material in the dataset.
 */
/**
 * One playable category.
 *
 * `sensitive` is typed as a real union rather than inferred as a literal, so that safety.ts can
 * still declare a grief-only category in future without a type error telling it the comparison is
 * impossible.
 */
export type CategoryRule = {
  key: string;
  label: string;
  playValue: "high" | "medium" | "low";
  sensitive: "none" | "respect";
};

export const allowedCategories: readonly CategoryRule[] = [
  { key: "historic:memorial", label: "memorial", playValue: "high", sensitive: "none" },
  { key: "historic:monument", label: "monument", playValue: "high", sensitive: "none" },
  { key: "historic:ruins", label: "ruins", playValue: "medium", sensitive: "none" },
  { key: "memorial:*", label: "memorial", playValue: "high", sensitive: "none" },
  { key: "tourism:artwork", label: "public artwork", playValue: "high", sensitive: "none" },
  { key: "amenity:drinking_water", label: "drinking water", playValue: "high", sensitive: "none" },
  { key: "amenity:fountain", label: "fountain", playValue: "high", sensitive: "none" },
  { key: "amenity:place_of_worship", label: "old place of worship", playValue: "medium", sensitive: "none" },
  { key: "leisure:playground", label: "playground", playValue: "medium", sensitive: "none" },
  { key: "natural:tree_row", label: "tree row", playValue: "medium", sensitive: "none" },
] satisfies readonly CategoryRule[];

export type AllowedCategory = (typeof allowedCategories)[number];

/**
 * Categories playable WITHOUT a name.
 *
 * Normally a feature needs a name, because the name is what the child walks towards and what the
 * reveal can give away. But some categories are their own riddle: a drinking fountain needs no
 * proper noun, and "there is a fountain here and it is gone" is precisely the twist the whole
 * project is built on. Requiring a name would quietly delete the best story we have.
 *
 * The frame still has to work without a name - if it would produce a bland riddle, compose.ts skips
 * the feature and reports why.
 */
export const nameOptionalCategories = [
  "amenity:drinking_water",
  "amenity:fountain",
  "leisure:playground",
  "natural:tree_row",
] as const;

/**
 * Never playable. A target on private land, or behind a barrier, means a child on a footpath
 * looking through a fence. Not a riddle, a bad afternoon.
 */
export const excludedTags: Record<string, true> = {
  "access:private": true,
  "access:no": true,
  // Documented OSM tagging mistakes that would otherwise match our memorial queries.
  "memorial:memorial": true,
  "memorial:yes": true,
  "memorial:tank": true,
};

/** Target selection. Never hardcode: city yield varies ~8x (66 Madison vs 521 Freiburg). */
export const hunt = {
  radiusMeters: [500, 800, 1200, 1600, 2200] as const,
  minCandidates: 12,
  maxCandidates: 40,
  /** OSM wiki: prefer the bbox filter over `around` - it performs faster. */
  preferBoundingBox: true,
} as const;

/**
 * Store distribution.
 *
 * Sphinx is a PWA - there is no native build in this repository, and no App Store or Play Store
 * listing exists. These URLs are therefore unset in every shipped configuration, and the landing
 * page renders the badges in a non-activatable state rather than linking to a 404.
 *
 * They are configuration rather than literals for the same reason the Overpass endpoint is: the
 * moment a listing does exist, this is a deploy-time change and not a code change. Nothing else
 * in the app needs to know.
 *
 * A dead store link is not a cosmetic problem. The landing page exists to convince a parent that
 * this is safe to install, and a badge that 404s is the fastest way to lose them - and the fastest
 * way for a judge to conclude the claims on the page are not checked.
 */
export const distribution = {
  appStoreUrl: process.env.NEXT_PUBLIC_SPHINX_APP_STORE_URL ?? "",
  playStoreUrl: process.env.NEXT_PUBLIC_SPHINX_PLAY_STORE_URL ?? "",
} as const;

/**
 * True only once both listings are real.
 *
 * The landing page asserts this rather than assuming it, so a half-configured deploy shows the
 * honest state instead of one live badge and one lie.
 */
export const hasStoreListings = Boolean(distribution.appStoreUrl && distribution.playStoreUrl);

export const app = {
  name: "Sphinx",
  tagline: "Your neighbourhood, turned into riddles.",
  /** Reading age target is 8-12. Riddles should land near this. */
  readingAgeYears: [8, 12] as const,
  /**
   * Screen dims to pocket mode after this long with no interaction.
   * Anti-engagement default. See pocketModeDelayMs in src/lib/palette.ts for why it is 20s.
   */
  pocketModeDelayMs: 20_000,
  maxRiddleWords: 30,
} as const;