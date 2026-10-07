# AGENTS.md

Working agreements for this repo. Read `PROJECT_CONTEXT.md` first — it is the source of truth and
this file does not repeat it.

## Before you write code

1. Read `PROJECT_CONTEXT.md`. Sections 2 (children), 3 (data reality), 4 (architecture),
   7 (integration contracts) are the ones that will stop you shipping a bug.
2. Check the current increment in `docs/roadmap.md`. Do the increment in front of you.
3. If you are touching OSM, read `docs/research/osm-data.md`. Half of it contradicts the original
   pitch.
4. If you are touching the model, read `docs/research/tinker-api.md`.

## Hard rules

- **The demo must work with no API key and no network.** Any code path that can only work with a
  paid service is a fallback path that must also exist and must be tested.
- **Never add a third-party network call to the client.** No CDN fonts, no analytics, no remote
  scripts, no telemetry. Assets are self-hosted. This backs the privacy claim in `PROJECT_CONTEXT.md`
  §4 and the offline requirement in §4. If you are unsure, it does not go in.
- **Never make a network request from the browser with a child's photo.** The vision check is
  local, full stop.
- **Generated riddle text is untrusted input.** It is linted (§2.2 — no movement instructions) and
  grounded-checked before it reaches a device. New generator output paths get the lint too.
- **Overpass and Nominatim are shared free infrastructure.** Serialize, cache, correct User-Agent,
  back off on 429/406/504. If you add a request that runs per-user-per-page-load, that is a bug.
- **Never auto-post an OSM Note.** Draft it, let a human submit it.
- **Do not hardcode a model id, an Overpass endpoint, or a Nominatim URL.** All three go through
  config; all three churn upstream.
- **Comments explain *why*.** The code says what. Do not narrate the code.

## Commit style

Short imperative subject, body only when the *why* is not obvious. Reference the increment:
`feat(osm): add adaptive radius widening (#2)`.

## When you learn something

If you discover a fact that would have changed a decision, add it to `PROJECT_CONTEXT.md` (§10 or
§11) **and** update the relevant `docs/research/` file with the source URL. Undocumented findings are
lost within the hour.

## Do not

- Refactor across increments to "clean things up". Working beats tidy with three days left.
- Add a feature that is not in the current increment, however tempting.
- Break the no-key demo path to make a nicer code path.