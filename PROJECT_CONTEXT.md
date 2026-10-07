# Sphinx — Project Context

> **Sphinx: your neighbourhood, turned into riddles.**
> An open-weight model reads the OpenStreetMap data around you and writes riddles about real
> places. You walk to find each one. A model on your phone checks your photo to confirm you got it.
> When something is missing from the map, the player's report goes back into the open map.

**This file is the single source of truth.** Read it before writing any code. Update it when you
learn something new. Everything here was verified against live sources on **2026-10-08** — treat
anything older as suspect and re-check it.

---

## 0. Read this first: the clock

| | |
|---|---|
| Challenge | [Hacktoberfest Open-Source AI Challenge, Week 1](https://dev.to/challenges/hacktoberfest-week1-2026-10-05) |
| Week theme | **Touch Grass** — "get people off the screen and into the world" |
| Contest opened | 2026-10-05 |
| **Submissions due** | **2026-10-11** |
| Winners announced | week of 2026-10-12 |
| **Today** | **2026-10-08 — three days left** |

Judging criteria, in priority order:

1. **Writing Quality — weighted most heavily.** The DEV post *is* the product for the judges.
   This is the single highest-leverage thing we build. Not the last thing.
2. **Relevance to the Prompt and Theme** — screen must be the shortest part of the experience.
3. **Creativity**
4. **Technical Execution**
5. Use of partner technology (optional, separate categories)

The submission template has fixed sections: What I Built / Demo / Code / How I Built It /
Why Does Open Innovation Matter / My Agent Session / Prize Categories.
**Start the write-up now, not at the end.** `docs/roadmap.md` sequences it accordingly.

**Target categories** (in priority order):

| Category | Prize | Status |
|---|---|---|
| Overall | $250 + DEV++ | target |
| **Best Use of Tinker** (Thinking Machines) | $200 | **primary** — we have a `TINKER_API_KEY` |
| Best Use of Gemma | $200 | secondary — only if it costs us nothing |
| Best Use of Backboard / Entire | $100 | cheap add-ons, decide later |

Best Use of Tinker requires: *"fine-tune a model for a specific task, and show a clear improvement
in performance, latency, or cost over a baseline."* **A baseline comparison table is mandatory,
not optional.** See §5.

---

## 1. Why this project exists

The world is the content. Every riddle points at a real object that really exists on Earth. You
cannot play it from a couch. And unlike most screen products, finishing it takes you *away* from
the screen.

**The one-line product metric:** a player should spend more time looking up than looking down.
If a child would rather scroll our UI than go outside, we have failed — regardless of what the
engagement dashboard says. There is no engagement dashboard. That is on purpose.

**The demo moment we are building toward:**

> The screen shows one line:
> *"I hold the names of those who didn't come home, and pigeons hold me."*
> You put the phone away and walk. You find the war memorial and take a photo.
> *"Correct. The inscription says 1919. Next…"*

**The twist that makes the write-up:** one riddle leads to a drinking fountain that is no longer
there. The player taps **"It's gone"** and Sphinx files an OpenStreetMap Note. *Playing the game
fixes the map of Earth.*

---

## 2. 🚨 Criticality: children will use this

This is not a demo that happens to be fun for kids. **A child will hand this to another child,
without us, in a neighbourhood we have never visited.** Treat every line of this section as a
release blocker. Section 2 is not "nice to have" — it is the product.

### 2.1 The anti-engagement rule (governs all UI decisions)

The theme is *Touch Grass*. Our app must be boring. It must be the shortest, least pleasant thing
in the child's evening. Concretely:

- **No streaks, no badges, no leaderboards, no daily reminders, no push notifications.** A hunt
  that nags is a hunt that gets deleted.
- **No infinite scroll anywhere.** Every list in this app is finite and knows its length.
- **The reveal is the reward.** No confetti, no particles, no "+50 XP". The reward is a fact about
  a real place the child just walked to and stood in front of.
- **Pocket mode is a first-class screen, not a setting.** After 10 seconds of reading a riddle, the
  screen should be allowed to go dark. A child who is walking with a glowing phone in their face is
  not touching grass. Default to the screen being *off*.
- Success metric for the write-up is **time-to-pocket**, not time-in-app.

### 2.2 Physical safety — the one that actually hurts someone

A riddle tells a child where to walk. Get this wrong and a child is in a road.

- **No riddle text may instruct movement.** Riddles describe a *place*, never a route, never
  "cross the road", "follow the path", "turn left". A prompt-level lint must reject any completion
  containing movement verbs. This is a hard filter on generated output, checked server-side before
  the text ever reaches a device.
- **Target objects must be reachable by an adult and a child on foot, via public rights of way.**
  When we build a hunt we filter out anything on a motorway, in a rail cutting, behind a fence with
  `access=private`, or on private land. If OSM says the access is private, the riddle is not playable.
- **Age gate + adult consent.** Under-12s require an adult to have started the hunt. One tap, not a
  form.
- **Know Your Location / dead-man switch.** A child walking alone must be able to share their
  position with an adult. Optional, off by default, explicit.
- **Battery and signal are safety issues.** A phone that dies mid-hunt in an unfamiliar place is a
  real-world failure. Everything must work with the phone in airplane mode (§6). Show battery state
  in the parent's panel, not the child's.

### 2.3 Stranger safety — the risk nobody thinks about

This is a game that tells children to photograph public objects and talk to adults about it. That
creates two exploitable lures:

1. **"I'm helping with the Sphinx game."** An adult approaches a child. We must give the family a
   script. This goes in the parent panel, verbatim, and is part of the app's safety story:
   *Only play with someone whose grown-up you already know. No matter what a stranger tells you,
   get back to your own grown-up and tell them.*
2. **Unsupervised uploads.** A child photographing a stranger, or their home, or a school. Photos
   stay on the device (§4) so this is structurally prevented, not policy-prevented.

### 2.4 Content safety — OSM contains things no child should meet as a game

OSM faithfully records the entire human record. That includes:

- execution sites, graves, memorials to specific dead people
- memorials to war dead, to victims of atrocities, to suicides
- Holocaust and genocide memorials, disaster sites, disease outbreaks

A riddle generator that turns an execution site into a jokey treasure hunt is a serious harm and
would rightly end the project's reputation. Requirements:

- **Category gate on hunt content.** Playable categories are a fixed, reviewed allowlist (§3).
  Anything sensitive is excluded from hunt generation by default, not filtered by string matching
  afterwards.
- **Generator sees a sanitised feature.** Give the model the tags, not a photo, and never a
  personal name of a deceased individual unless it is a public figure with a `historic=memorial`
  classification.
- **A parent reviews the hunt before it starts.** The generated riddles are printed in full on one
  screen for the adult. No surprises mid-walk.
- **A human-readable "why this is here" line.** Every object reveals a real fact — this is where
  the educational payload lives. War memorials should be revealed with respect, not as a win
  animation.

### 2.5 Map-correctness as an education, not a prank

The twist — "the fountain is gone, report it" — is the most valuable thing in this project. It
teaches a child that **the map is made by people, and can be wrong, and they can fix it.** Protect
that:

- **Never auto-post.** OSM policy explicitly forbids automated notes ("Notes should be a
  human-to-human communication"). See §7.3 for the exact API and the exact rule. The server refuses
  any note without explicit human confirmation, and there is no queue, batch or auto-post path
  anywhere in the codebase — `npm run check:privacy` asserts all three.
- The child reads the **exact text** before anything is sent, and a grown-up presses send. Showing
  the draft is the mechanism, not a courtesy: a precise, polite note is far more likely to be acted
  on, which is also why it is better for the child — their report actually gets fixed.
- **Provenance is on by default.** Mappers generally prefer knowing how a report was generated, and
  hiding the tool would burn our standing with the community we depend on.
- Never present a map error as a score loss. Phrase it as *"you found something the map got wrong."*
  That is the best line in the app.
- **Do not post to real OSM to test this.** Filing a note to verify the feature works would itself
  break the rule the feature exists to obey. `npm run check:notes` uses a local stub instead.
- **War memorials are not reportable.** A child who cannot find a memorial has probably not found
  it yet, and a note saying so is noise for a volunteer mapper.

### 2.6 Accessibility is a correctness requirement

Roughly 1 in 5 children has a language or attention difference. Minimum bar before we call it done:
legible type outdoors (bright sunlight, low contrast screens), dyslexia-friendly option,
44px+ touch targets, no time pressure anywhere, no colour-only signalling (the verify states must
be distinguishable without colour), full keyboard/switch access, and it must be usable one-handed
with a phone in a pocket.

---

## 3. Data reality check (verified live, 2026-10-08)

Full detail in `docs/research/osm-data.md`. **Read that before writing any query.** The headline
corrections to the original pitch:

| Assumed category | Reality in a Western European city centre @1500m | Use it? |
|---|---|---|
| `historic=memorial` | **126** | ✅ primary |
| `tourism=artwork` | **167** | ✅ primary |
| `amenity=place_of_worship` | 50 | ✅ with filtering |
| `amenity=drinking_water` | 8 | ✅ the twist, rare and precious |
| `amenity=fountain` | 11 | ✅ |
| `leisure=playground` | 30 | ✅ good for young kids |
| `historic=ruins` / `=monument` | 4 / 6 | ✅ |
| `natural=tree` (**named**) | **2** | ❌ too rare — use unnamed |
| `man_made=statue` | **0** | ❌ does not exist in practice |
| `man_made=sundial` | **0** | ❌ does not exist in practice |
| `man_made=obelisk` | **0** | ❌ |
| `historic=castle` | 0 inland | ⚠️ coastal/small-town only |

**Do not build a hunt around named trees, statues, sundials, or obelisks.** A hunt built on those
tags is an empty hunt. The high-yield allowlist is memorials, artwork, drinking water, fountains,
playgrounds, places of worship with real history, and ruins.

Counts by city (same tag set @1500m): Freiburg 521 · Wellington 259 · Bristol 255 · Portland 240 ·
Utrecht 225 · Ljubljana 213 · **Madison 66**. An ~8× spread. **Never hardcode a radius** — query,
count, and widen adaptively until there are enough candidates.

The highest-value tag for riddle writing is `inscription`. Real examples pulled from Bristol:

```
"Mary Carpenter, aided by Lady Byron, founded this Reformatory AD 1854"
"On this corner site from 1791‒1798, Joseph Cottle (1770‒1853) bookseller, publisher and poet. The
 first effective publisher of the poems of Coleridge, Southey, Lamb and Wordsworth…"
```

That is the entire product in one field. A model given `inscription` + `name` + `start_date` can
write riddles that are *actually true*, which is what makes this better than generic generated
content.

### The blue plaque scheme — the best material, and easy to miss

Found by dumping real tags during increment 2, not by reading the wiki:

| Tag | Example | Value |
|---|---|---|
| `plaque=here_lived` / `here_worked` | `here_lived` | the distinguishing fact, and trivially checkable by the child |
| `memorial=blue_plaque` | | English Heritage scheme |
| `openplaques:id` | `934` | thousands of identical plaques |
| `historic:date` | `1882..1886` | **a range**, and **not** `start_date` |

Reading only `start_date` hid every blue plaque in Bristol. Note the naming convention
`"<person> blue plaque"` — a naive spoiler check then rejects any riddle that honestly mentions that
the plaque is blue, so trailing category suffixes are stripped before checking.

Raw JSON and the full tag table are in `docs/research/osm-data.md`.

---

## 4. Architecture (locked)

```
Next.js 15 App Router · TypeScript · Tailwind · PWA
├── src/app/                  UI routes + API routes
│   ├── api/hunt/generate     OSM fetch → riddle generation → offline hunt artifact
│   ├── api/vision/…          (nothing — vision runs on device, by design)
│   └── play/[huntId]         the entire in-the-field experience
├── src/lib/osm/              overpass.ts · nominatim.ts · scoring.ts · safety.ts
├── src/lib/riddles/          prompt.ts · lint.ts · template-fallback.ts
├── src/lib/vision/           clip.ts (transformers.js, lazy-loaded)
└── src/lib/offline/          service worker, hunt store (IndexedDB)
data/
├── riddles/                  pre-baked hunt JSON — the demo must never need a key
└── train/osm_riddles.jsonl   the Tinker fine-tune dataset (generated)
scripts/
├── build-dataset.ts          OSM sweep → training JSONL
├── train.py                  Tinker LoRA fine-tune
└── eval.py                   baseline vs tuned — produces the comparison table
```

### The privacy claim, and why it is structural not decorative

> "Children's live GPS and photos are checked on the phone and never uploaded."

This is the claim that wins the "Why Does Open Innovation Matter" section, so it must be
**provably true, not promised**:

- Photo check runs in the browser via **transformers.js + a CLIP model**. No inference server. The
  image never leaves the device. No `fetch` of the blob anywhere in the code.
- Geolocation is only used for (a) building the hunt at home, (b) optional distance-to-target
  hints. It is never transmitted during play unless the player shares it deliberately.
- **No third-party anything**: no Google Fonts, no CDN scripts, no analytics, no error reporting
  that ships payloads. Self-host every asset. This is also an offline requirement.
- All OpenStreetMap traffic goes through a server route (`/api/hunt`), never from the browser —
  because Nominatim and Overpass rate-limit by User-Agent, and the browser cannot set one honestly.
  This doubles as the privacy guarantee: the client never talks to a third party at all.

**This is now enforced by `npm run check:privacy`, not asserted in prose.** It fails the build if
our source gains an outbound call site to a third party, if the service worker's own-origin guard is
removed, if a tile reference appears anywhere, or if an analytics package is added.

Measured in a browser on 2026-10-08, via the browser's own record of every request:

| Measurement | Result |
|---|---|
| Requests on page load | 8, **0 cross-origin** |
| Requests during the whole play loop | **0** |
| Runtime dependencies | `next`, `react`, `react-dom` |

> **On why the first version of that check was deleted.** It grepped the built bundle for hostnames
> and reported six "leaks": `nextjs.org`, `react.dev`, `w3.org`, `tailwindcss.com`, `github.com`,
> `openstreetmap.org`. Every one was a false positive — framework constants, licence comments, and
> the ODbL attribution link we are *required* to display. A check that cries wolf gets disabled, and
> a disabled privacy check is worse than no check because it looks like protection. It now matches
> **call sites**, not hostnames. Keep this lesson in mind when writing any other checker.

### Offline (also a safety requirement — see §2.2)

You build the hunt at home with a signal. You play it with no signal. So: the hunt is generated
once, stored in IndexedDB, and the service worker precaches the app shell. The tuned model is used
at **generation time only**. The phone needs nothing after that — including the CLIP model, which is
cached on first use.

---

## 5. The model: Tinker fine-tune

Full detail in `docs/research/tinker-api.md`. Read before touching `scripts/train.py`.

Docs live at **https://tinker-docs.thinkingmachines.ai/** (`docs.tinker.ai` is dead; append
`/index.md` to any page for raw Markdown, or grab `llms-full.txt`).

**Plan:** fine-tune a LoRA on `Qwen/Qwen3-8B` to turn an OSM feature into a two-line riddle plus a
visual signature. Cheapest viable option — training is `$0.44`/1M tokens. `gpt-oss-20b` is
`$0.396` but always emits chain-of-thought, which is wrong for a riddle. Gemma and Llama are **not
available** on Tinker (Llama retired 2026-06-12).

**Things that will silently cost us time and money:**

1. **The clock-cycle trap.** Submit `forward_backward` and `optim_step` *back-to-back*, then await
   both. Awaiting between them burns **3 clock cycles per step instead of 1**. This is the single
   most common throughput mistake and it is billed.
2. **`forward()` from a training client bills at the *train* rate.** NLL evaluation is not free.
3. **Model churn is real.** Twelve Qwen models were retired in one June 2026 batch. Read
   `https://tinker-docs.thinkingmachines.ai/tinker/models.json` at runtime; never hardcode a model
   id as a hard dependency.
4. **Never wrap Tinker calls in `asyncio.wait_for` + retries.** The docs are explicit that this
   turns slowness into total failure and amplifies load.
5. Set `ttl_seconds` on every checkpoint save. Storage is `$0.10/GB-month`.
6. `save_weights_for_sampler` gives sampleable weights. `save_state` gives resumable weights. They
   are not interchangeable — you want the former for the final artifact.

### Status: the harness is built, the run is blocked

`scripts/build-dataset.ts`, `scripts/train.py` and `scripts/evaluate.ts` are complete and committed.
The fine-tune itself is blocked on one thing only: **Tinker returns 402 BillingError** until a payment
method is added at `https://tinker.thinkingmachines.ai/billing/balance`. The API key is valid — it
authenticates and reaches the billing check.

```bash
npm run train && npm run eval
```

No code needs to change. See `docs/roadmap.md` §6.

**The measurement we must publish.** Baseline vs fine-tuned, on a **held-out set of OSM objects
never seen in training**, scored by:

| Metric | Why it matters |
|---|---|
| `test/nll` | Tinker's own metric, apples-to-apples |
| Groundedness | % of riddle facts traceable to a tag in the OSM feature — **this is the child-safety metric** (§2.4). A model that invents a date is worse than useless here. |
| Leakage | % of riddles that name the target outright instead of describing it |
| Length & voice | matches our house style (§8) |
| Latency + cost per riddle | the Tinker category explicitly asks for latency/cost improvement |

A fine-tune that wins on nll but *loses* on groundedness is a regression. Groundedness is the
metric we optimise; nll is the metric that proves the fine-tune worked.

**Dataset as built:** 15 cities across 4 continents, 526 real OSM objects plus 29 hand-written
house-voice seeds, 443 train / 112 held out. **The split is by OSM object, never by row** — a row-level
split would put the same memorial on both sides and measure memorisation.

**Vary the prompts, not the completions.** This is why the builder sweeps fifteen cities rather than
one: Bristol's tagging habits are not Portland's, and a model trained on one city's conventions will
confidently misdescribe another's. Docs' capacity heuristic (LoRA params ≥ completion tokens) is
cleared ~1000× at rank 32, so **data diversity is the binding constraint, not rank.**

**Groundedness is enforced at build time, not just measured at eval time.** The first build produced
94% of rows whose prompt did not contain the facts their target asserted — training on that teaches a
model to *invent*, which is the one failure this project exists to prevent, and it looks fine in the
output. Three guards now catch it; the last aborts the build. See `docs/roadmap.md` §6.

**LR sweep, if time allows after the first run:** 3 LRs × 2 ranks. Tinker's own advice is that LR
matters more than rank and a bad LR is hard to recover from. Defaults to a single 2e-4 / rank 32 run,
which is inside the documented range.

---

## 6. On-device vision — CLIP zero-shot

The design that makes this work without training anything:

1. The riddle generator emits **two** things per object: the `riddle` and a `visual` signature —
   a short literal image caption derived from the tags.
   e.g. tags `historic=memorial, memorial=plaque, material=stone`
   → riddle: *"I hold the names of those who didn't come home, and pigeons hold me."*
   → visual: *"a small weathered rectangular stone plaque mounted flat on a brick wall"*
2. On the phone, transformers.js loads a small CLIP model (WebGPU, WASM fallback) and scores the
   child's photo against the visual signature.
3. Confidence bands map to states a child can act on.

**Three states, never a bare score:**

| State | Condition | What the child sees |
|---|---|---|
| ✅ | score over threshold | *"Correct. The inscription says 1919. Next…"* |
| ❓ | inconclusive | *"I can't tell — try again, or ask the grown-up."* **Never a wrong ✗.** A child who photographs the right thing and is told "wrong" will stop playing. |
| ❌ | confident mismatch | *"That's not it. Keep walking."* |

**Be honest in the write-up.** A CLIP zero-shot score is a *plausibility* check, not proof of
identity. We will say so plainly. That honesty is worth more to the judges than overclaiming, and it
matters more still when the user is a child. The parent panel states the same thing.

---

## 7. Integration contracts (verified live — do not trust older tutorials)

### 7.1 Overpass
- Endpoint: `https://overpass-api.de/api/interpreter` — **make it config, never hardcode.**
- `User-Agent: Sphinx/0.1 (+https://<real-domain>; <real-email>)`. Nominatim returned **403** for a
  UA containing `example.org`. No placeholder domains in production.
- **Serialize all requests. Cache hard.** We hit a real **429** after ~8 rapid sequential queries
  from one IP, plus intermittent **504**s. Retry with backoff; 429/406 → wait 30s.
- Working riddle query (`out center 200;`) is in `docs/research/osm-data.md`. Use `out center;` —
  verified 267/267 features get usable coordinates. Read `e.lat ?? e.center?.lat`.
- `[bbox:...]` must be in the **first** settings statement, and is `south,west,north,east`.
- **Overpass bans deployment on AI-app-builder platforms** ("lovable.app or netlify.app"). We deploy
  on Render or not at all.

### 7.2 Nominatim
- Hard cap **1 request/second**. Must cache. Must send a real User-Agent.
- **Forbidden: client-side autocomplete** and "systematic queries" (grid sweeps of every POI in an
  area). A user-initiated one-shot hunt build is fine. A "give me every riddle in every city" crawl
  is not — so the hunt builder is explicit and user-triggered, never a background sweep.
- Nominatim's usage policy also bans vibe-coding platforms.
- Alternative that needs no key: `https://photon.komoot.io/api/` (verified 200).

### 7.3 OSM Notes — the original plan was wrong in two ways
- **`POST /api/0.6/notes/create` returns 404.** It is dead. The correct endpoint is
  `POST /api/0.6/notes?lat=…&lon=…&text=…`, or JSON to `/api/0.6/notes.json`.
- **The Notes API has no photo support at all.** No image parameter exists. If we ever want the
  photo attached to the note, the only route is the openstreetmap.org web UI. Design the flow to
  not depend on it.
- Only `lat`, `lon`, `text` are required. Anonymous works. New since May 2026: unauthenticated
  writes inside a **Moderation Zone** get **403**.
- **Policy is a hard constraint:** "Don't create automated notes. Notes should be a human-to-human
  communication." → we draft, the human submits. This is also better for the child (§2.5).

### 7.4 Attribution — not optional, it's ODbL
Credit "OpenStreetMap" linking to `https://www.openstreetmap.org/copyright`. It may auto-collapse
after 5s if there remains an `(i)` button or an "About / Data licences" entry. Must be legible.

> **Open legal question, flagged:** a hunt stores OSM-derived objects and riddles server-side. That
> may constitute a **Derivative Database**, which requires attribution *and* ODbL licensing of the
> database. A small request cache is likely fair use. This is the project's main legal risk —
> resolve before a public launch, cite in the write-up either way.

### 7.5 Tiles — offline is explicitly banned
`tile.openstreetmap.org` forbids offline/bulk download. **So the offline map cannot come from
OSM's raster tiles.** Options: vector tiles from `vector.openstreetmap.org` (shortbread, maxzoom
14), self-hosted via `switch2osm.org`, or — most likely what we ship — **no interactive map during
play at all**, only a static "you are here" sense-and-direction-free card. The brief says the
riddle makes you walk; a map that pinpoints the answer would kill the game. Revisit this; do not
assume a map is needed.

---

## 8. Product design charter for children

UI and product design is the team's stated priority. Principles, in force:

1. **The screen is a card, not a world.** One idea per screen. The riddle screen has exactly one
   line of riddle on it and almost nothing else.
2. **Reading age 8–12.** Short words. One sentence per riddle, ideally under 25 words.
3. **Every action is one thumb.** One-handed, bottom of screen, reachable. No two-handed gestures.
4. **No dead ends.** If a child taps something, something visibly happens. Always a way back that
   a 7-year-old can find.
5. **Motion is used sparingly and never to demand attention.** Nothing blinks. Nothing bounces.
   Reduced-motion is respected.
6. **States are words, not colours.** Green check and red cross each carry text and a distinct icon.
7. **The reveal is a fact, not a score.** Every answer ends by telling the child something true about
   the place they just stood in. This is the whole reason the app exists.
8. **Adult surface is separate.** Parent panel (consent, review-the-hunt, safety script, privacy,
   note drafts, battery) lives behind its own gate so the child's screen stays clean.
9. **Pocket mode.** Screen sleeps; next riddle available with one wake tap. Default behaviour.
10. **Riddles are printed.** The parent can print the hunt on one A4 page. A hunt that needs a
    screen at every step is not a hunt.

### Riddle voice (the house style)

- Two lines maximum. One image, then a turn.
- **Never name the target.** Naming it ends the game.
- **Every clue must be checkable against the OSM tags we hold.** If the child cannot walk up and
  verify it, it is decoration, and it teaches children to trust decoration.
- Restrained, not whimsical for children. War memorials get respect, not jokes.
- The demo line — *"I hold the names of those who didn't come home, and pigeons hold me"* — is the
  register. Sober, physical, two concrete facts with a turn. Everything we generate should sound
  like it.

---

## 9. Roadmap — deliver in this order

Full detail in `docs/roadmap.md`. **Do not build in one shot.** Increment order, each ending in
something runnable:

| # | Increment | Ends with |
|---|---|---|
| 0 | Context + scaffold | this file, repo running |
| 1 | Design system + riddle screen | the hero screen, static, in the browser |
| 2 | OSM layer + riddle-generator fallback | real objects, deterministic riddles, no model needed |
| 3 | Hunt flow + offline store + pocket mode | a complete playable hunt on a phone in airplane mode |
| 4 | CLIP verify | photo check working on device |
| 5 | "It's gone" → OSM Note draft | the twist, complete |
| 6 | Tinker fine-tune + eval | the comparison table |
| 7 | Parent panel + safety + accessibility | shippable |
| 8 | **The write-up** | submission |

**Non-negotiable:** the demo must work with **no API key and no signal**. Any increment that
introduces a hard dependency on a paid service before increment 8 is the wrong increment.

---

## 10. Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | Next.js 15 App Router + TS + Tailwind | one deployable; API routes needed anyway to proxy OSM with a correct User-Agent; fastest path to a real PWA with 3 days left |
| 2026-10-08 | CLIP zero-shot via transformers.js for the photo check | generalises to any OSM tag with no per-class training, runs fully offline, keeps photos on device — the structural privacy claim depends on this |
| 2026-10-08 | Proceed with Tinker fine-tune (key in hand) | primary prize category, and the fine-tune is what makes riddles true rather than plausible |
| 2026-10-08 | Hunt category allowlist replaces the original tag wishlist | `man_made=statue`/`sundial`/`obelisk` and named `natural=tree` are near-zero in practice; a hunt built on them is empty |
| 2026-10-08 | Notes are drafted, never auto-posted | OSM policy forbids automated notes; better for the child; keeps the educational moment human |
| 2026-10-08 | Optimised for groundedness, not nll, when they conflict | a riddle that invents a fact is worse for a child than no riddle at all |
| 2026-10-08 | Pocket mode after 20s, and never for keyboard/AT users | the brief's own number (10s) fires mid-word for a 9-year-old; dimming exists for glare, and disappearing content mid-sentence is hostile to assistive tech |
| 2026-10-08 | Palette lives in `src/lib/palette.ts`, mirrored into CSS, drift-checked | the daylight-legibility rule is only credible if it is calculated rather than eyeballed; `npm run audit:contrast` fails on drift |
| 2026-10-08 | No map or coordinate on the play screen | a map that pinpoints the answer ends the game; the walking *is* the product |
| 2026-10-08 | "Respectful" decided by memorial **subtype** (`war_memorial`, `cenotaph`, `stolperstein`) not by category | `historic=memorial` spans a cenotaph and a singer's house. Classing the category sensitive silently deleted every blue plaque in Bristol |
| 2026-10-08 | Respect features capped at 25% of any hunt | the war memorial riddle is the demo so we cannot exclude them, but five in a row treats grief as an arcade |
| 2026-10-08 | A feature with only a name is skipped, not given a bland riddle | "Something here is on the map" is decoration; the charter forbids decoration |
| 2026-10-08 | Unnamed fountains/playgrounds/tree rows are playable | the category *is* the riddle. Requiring a name would delete the "it's gone" material, which is the best story in the project |
| 2026-10-08 | Template riddles emit a `clues[]` array traced to source tags | groundedness is the metric we optimise (increment 6). It has to be measurable, not asserted. |
| 2026-10-08 | Overpass 30s cooldown honoured literally, even though it costs 30s | OSM is volunteer-run infrastructure and asks for it explicitly |
| 2026-10-08 | Hunt files in `data/riddles/` licensed **ODbL**, not MIT | a hunt stores OSM-derived objects *plus* generated riddles and facts — a Derivative Database. Closes the §11 legal question. |
| 2026-10-08 | Photo check ships the vision tower only; text embeddings precomputed to an 84KB JSON | CLIP ViT-B/32 is 146MB on a phone. Our vocabulary is closed, so the text side never needs to ship. 13× reduction. |
| 2026-10-08 | Text tower is NOT ported to Python — it never needed porting | the ONNX broadcast error `17 by 77` was a missing `max_length: 77`, not an unsupported model. A specific error message is worth reading before building a day of work on a guess. |
| 2026-10-08 | `db.onversionchange` closes the connection immediately | a stale tab silently blocked a `deleteDatabase` from anywhere else — the exact "nothing can fix it" failure the store exists to prevent |
| 2026-10-08 | No map during play, framed as a design strength | a map that pinpoints the answer ends the game; also sidesteps OSM's ban on offline tile use |
| 2026-10-08 | Dataset built by sweeping **15 cities in 4 continents** | "vary the prompts, not the completions" — one city's tagging habits would teach a model to misdescribe another's |
| 2026-10-08 | Held-out split is **by OSM object, never by row** | a row split puts the same memorial on both sides and measures memorisation, not generalisation |
| 2026-10-08 | Dataset build **aborts** if any target claims a number its prompt lacks | the first build was 94% hallucination-teaching rows. A check that only warns is a check that gets ignored |
| 2026-10-08 | Eval safety metrics are **pass/fail**, and `evaluate.ts` exits non-zero | a safety regression is not a lower average, it is a reason not to ship |
| 2026-10-08 | Hand-written training seeds go through the **same checks as generated text** | the seeds were caught inventing 1901, claiming writing with no `inscription` tag, and phrasing a route. Authoring by hand is not safer than generating |
| 2026-10-08 | An object's own dimensions are **not** wayfinding | `height` is one of the commonest tags on the monuments Sphinx hunts; rejecting "I am 3 m tall" would reject the best objects the app has |
| 2026-10-08 | The dimension veto looks **forward only**, for an explicit dimension word | a subject-before-the-number test admits "I am 200 m from the square". The safety suite caught this the day it was written |
| 2026-10-08 | Any **relaxation** to a safety lint gets assertions in both directions | a guard that only tests the new behaviour does not catch the veto widening |
| 2026-10-08 | Playground surfaces get a **per-surface** phrase, not one blanket clause | "laid in sheets rather than poured" was false for asphalt and woodchips — a generator shortcut, not bad OSM data |
| 2026-10-08 | The fallback-rate metric was **deleted as vacuous**, replaced by specificity | the generator never emits a `last-resort` frame, so both sides scored 100% and the comparison could never move |
| 2026-10-08 | Hand-written training data is **not** safer than generated data | the seeds invented a year and claimed an inscription tag that did not exist, while the guards were being written |
| 2026-10-08 | The model is a **candidate generator**; the lint + groundedness check are the guarantee | a 2-epoch LoRA learned "one of the dates on me is YYYY" and invented 1923 for a prompt with no date. It needed rescuing on 3.3% of held-out riddles |
| 2026-10-08 | Eval reports **raw / shipped / baseline** and decides the winner on shipped | deciding on raw would mean calling a model safe on generations that never reach a child |
| 2026-10-08 | **Greedy sampling (temp 0)** for riddle generation | slot-filling is a sampling-variance failure; 0.7 → 0.0 halves the rescue rate, 3.3% → 1.7% |
| 2026-10-08 | Temperature was swept on the reported held-out set, so those numbers are **optimistic** | the un-swept default is the unbiased row. Stating this is worth more than a better-looking table |
| 2026-10-08 | **Temperature 0.4**, not greedy | below 0.7 the rescue rate halves; greedy is slightly *more* repetitive because determinism narrows what can vary |
| 2026-10-08 | Consent is a **pure function** in `src/lib/safety/consent.ts` | a consent gate that can only be verified by clicking through it is one nobody verifies |
| 2026-10-08 | Consent records the **stop count that was reviewed**, and stale consent reopens the gate | otherwise nothing stops a hunt growing after an adult read it, making review decorative |
| 2026-10-08 | The gate is **re-checked at play time**, not only at build time | the person tapping the phone is the child; a gate enforced only where an adult is looking is not a gate |
| 2026-10-08 | **One** review screen, shared | two would drift apart and only the one someone remembered would get fixed |
| 2026-10-08 | The stranger script lives in **data** and is asserted verbatim | the most important sentence in the app must not be truncatable by a refactor |
| 2026-10-08 | The script must contain **no exception clause** | a rule with an "unless" in it gets read the wrong way by a nine-year-old under pressure |
| 2026-10-08 | Age is stored as a **band, never a date of birth** | a birthday is data we have no reason to hold; 12 is the only distinction any screen needs |
| 2026-10-08 | A **disabled** primary action is a solid colour, not reduced opacity | WCAG exempts disabled controls; a nine-year-old does not have that exemption |
| 2026-10-08 | A **check that cannot fail is decoration** — repo-wide rule | caught a vacuous fallback metric, a spoiler check on the wrong field, and a refusal check that passed an allowed decision |
| 2026-10-08 | `npm run check:claims` audits **the write-up against the repo** | the post argues that checkable claims beat trusted ones; it would be incoherent if its own numbers drifted |
| 2026-10-08 | The post gives each of the four challenge claims a **"where it does not hold"** | including that 425 of 477 training rows carry a real name and went to a third-party API |
| 2026-10-08 | A **failed** data point is stated, not dropped from a count | the post said "fifteen cities" when the dataset held fourteen; Tallinn failed Overpass and is now named |

---

## 11. Open questions

### Still open — needs a real phone

All three need the same thing: a human, a phone, and about fifteen minutes. Grouped rather than
repeated because they are one errand, not three.

- [ ] **Airplane mode on a real phone.** Everything in increment 3 was measured in a desktop browser
      against a localhost server: 0 cross-origin requests, 0 requests during play, service worker
      active, progress persisted. Unverified on real hardware: the service worker install prompt,
      safe-area insets on a notched phone, IndexedDB quota, pocket-mode timeout, and whether the
      dimmed screen is dim enough to notice outdoors.
- [ ] **Daylight legibility.** The contrast maths is sound — riddle text 15.87:1, holding 8.73:1
      through the glare model, against an AA bar of 4.5:1 — but it is calculated, not observed.
      Screenshots were also impossible in the build environment.
- [ ] **The photo check on a real photograph.** Alignment is proven in Node (`npm run check:vision`)
      and the weights load through the same ONNX runtime, but no real photo has been scored on a
      real device. WebGPU vs WASM latency is also unknown.
- [ ] **The consent gate has never been clicked through by a human.** Added in increment 7. What is
      proven: `evaluateGate` returns the right decision for all six cases against the **real** baked
      demo hunt, `/build`, `/play/demo`, `/parent` and `/privacy` all serve 200, and 125 safety checks
      pass. What is **not** proven: that the screens read correctly to a person, that the disabled
      primary action looks obviously disabled, and that a child cannot find a way past the locked
      screen. The browser harness in this environment could not screenshot (no visible desktop), so
      there is no visual evidence. **Someone needs to click through it once on a real phone** — and
      that is the same errand as airplane mode and daylight legibility above, so it is one trip.

### Still open — needs data we do not have

- [ ] **Calibrate the photo-check thresholds.** `THRESHOLDS.correct = 0.26` has never been run
      against real photographs of real memorials; the best synthetic-frame score is 0.158. Needs
      roughly 20 real photos with a human labelling each. **Until then the "I can't tell" band must
      stay wide** — a photo check that confidently rejects a correct photo is worse for a child than
      one that admits uncertainty. `npm run check:vision` prints this gap rather than faking a pass.
- [ ] **Closed-vocabulary margins.** Only 20 captions are ever compared, so the `anyMatch > expected
      + 0.04` rule in `decide()` may be too tight or too loose in ways synthetic frames cannot
      reveal. Fold into the same calibration pass.
- [ ] **The live service's ODbL position.** The `data/riddles/` files are settled (ODbL, see the
      README licence section). Hunts generated at runtime and stored server-side may additionally be
      a Produced Work. `/privacy` in increment 7 must state the position rather than leave it implied.
      **Partially done:** `/privacy` names ODbL and disclaims affiliation, but does not yet address
      whether a runtime-generated hunt is a Produced Work. Still owed before the write-up.

### Resolved since increment 0

Kept so the reasoning is not re-litigated.

| Question | Answer | Where |
|---|---|---|
| Is a stored hunt an ODbL Derivative Database? | **Yes** — OSM objects plus generated riddles and facts. Hunt files are ODbL, not MIT. | README licence, §10 |
| Does the hunt need a map during play? | **No.** A map that pinpoints the answer ends the game, and it sidesteps OSM's ban on offline tile use. A deliberate design strength, not an omission. | §10 |
| Which CLIP checkpoint? | **MobileCLIP-S0** — 11.3MB vision tower, 6.3ms, 67.8% on Apple CVPR 2024. | `docs/roadmap.md` §4 |
| Is Render permitted for OSM use? | **Yes** — Render is a PaaS, not a vibe-coding platform. Mentioned at deployment. | `docs/roadmap.md` §8 |
| Gemma as a secondary prize category? | **Skipped.** Not on Tinker, and ~700MB in-browser is not acceptable for this audience. Revisit only if increment 6 finishes early. | §10 |
| `deleteDatabase` blocked by a stale tab? | **Fixed** with `db.onversionchange`. | `src/lib/offline/store.ts` |
| Does MobileCLIP's text tower run in transformers.js? | **Yes** — it never did not. The tokenizer was not padding to CLIP's fixed 77-token sequence, and the error `17 by 77` said so. | `src/lib/vision/model-files.ts` |