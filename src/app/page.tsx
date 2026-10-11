"use client";

import { useState } from "react";
import { OsmAttribution } from "@/components/OsmAttribution";
import { InstallButton } from "@/components/InstallButton";
import { StoreBadge } from "@/components/StoreBadge";
import { SphinxMark } from "@/components/icons";
import { app, distribution, hasStoreListings } from "@/lib/config";

/**
 * The demo riddle from live Bristol map data.
 * The fastest way to explain Sphinx is to show the actual riddle, not a theoretical description.
 */
const DEMO_RIDDLE = "I hold the names of those who didn't come home, and pigeons hold me.";
const YOUTUBE_URL = "https://youtu.be/5VDXL1FvSP8";
const YOUTUBE_EMBED_URL = "https://www.youtube-nocookie.com/embed/5VDXL1FvSP8?autoplay=1&rel=0";

export default function Home() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState<"ios" | "android" | "desktop">("ios");

  return (
    <div className="min-h-dvh bg-paper text-ink selection:bg-sand selection:text-ink">
      {/* =====================================================================
          1. TOP NAVIGATION BAR (Unicorn SaaS Header)
          ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-sand/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Logo & Brand */}
          <a
            href="/"
            className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-ink"
          >
            <img
              src="/icon.svg"
              alt="Sphinx Logo"
              width={34}
              height={34}
              className="h-8.5 w-8.5 rounded-lg border border-sand/80 bg-paper-raised p-0.5 shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-ink sm:text-xl">{app.name}</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main Navigation">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              How It Works
            </a>
            <a
              href="#demo-video"
              className="text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              Demo Film
            </a>
            <a
              href="#the-twist"
              className="text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              The Map Twist
            </a>
            <a
              href="#safety"
              className="text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              Safety & Privacy
            </a>
            <a
              href="/parent"
              className="text-sm font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              Parent Guide
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="/play/demo"
              className="flex min-h-10 items-center justify-center rounded-xl border border-sand bg-paper-raised px-4 text-xs font-semibold text-ink shadow-xs transition-colors duration-150 hover:bg-sand/40 active:translate-y-px"
            >
              Play Sample Walk
            </a>
            <a
              href="/build"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-stone-deep px-4 text-xs font-semibold text-paper shadow-sm transition-colors duration-150 hover:bg-ink active:translate-y-px"
            >
              Build Walk
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sand bg-paper-raised text-ink md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-sand bg-paper-raised px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-sm font-medium text-ink"
              >
                How It Works
              </a>
              <a
                href="#demo-video"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-sm font-medium text-ink"
              >
                Demo Film (YouTube)
              </a>
              <a
                href="#the-twist"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-sm font-medium text-ink"
              >
                The Map Twist
              </a>
              <a
                href="#safety"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-sm font-medium text-ink"
              >
                Safety & Privacy
              </a>
              <a
                href="/parent"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-sm font-medium text-ink"
              >
                Parent Dashboard
              </a>
              <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-sand">
                <a
                  href="/build"
                  className="flex min-h-tap-min items-center justify-center rounded-xl bg-stone-deep text-action text-paper"
                >
                  Build a Walk
                </a>
                <a
                  href="/play/demo"
                  className="flex min-h-tap-min items-center justify-center rounded-xl border border-sand bg-paper text-quiet text-ink"
                >
                  Play Bristol Sample Walk
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* =====================================================================
            2. HERO SECTION
            ===================================================================== */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
          {/* Subtle Ambient Radial Highlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-sand via-paper-raised to-sand/40 opacity-70 sm:left-[calc(50%-20rem)] sm:w-[72rem]" />
          </div>

          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            {/* Announcement Badge */}
            {/* <div className="inline-flex items-center gap-2 rounded-full border border-sand bg-paper-raised px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-found" />
              <span>Hacktoberfest 2026 AI Challenge</span>
              <span className="text-sand">&bull;</span>
              <span className="font-semibold text-ink">Touch Grass Theme</span>
            </div> */}

            {/* Main Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-6xl md:text-7xl">
              Your neighbourhood, <br className="hidden sm:inline" />
              <span className="text-stone-deep underline decoration-sand decoration-wavy decoration-from-font">
                turned into riddles.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg sm:leading-8">
              An open-weight model reads the OpenStreetMap data around you and writes riddles about real places. You walk
              to find each one. A model on your phone checks your photo with zero data uploaded. And when something is
              missing from the map, you fix the Earth.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
              <a
                href="/build"
                className="flex min-h-tap-primary w-full items-center justify-center gap-2 rounded-2xl bg-stone-deep px-8 text-action text-paper shadow-md transition-all duration-150 hover:bg-ink hover:shadow-lg active:translate-y-px sm:w-auto"
              >
                <span>Build a Walk Near You</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
              <a
                href="/play/demo"
                className="flex min-h-tap-primary w-full items-center justify-center gap-2 rounded-2xl border-2 border-stone bg-paper-raised px-8 text-action text-ink transition-colors duration-150 hover:bg-sand/60 active:translate-y-px sm:w-auto"
              >
                <span>Play Sample Walk (Bristol)</span>
              </a>
              {/* <a
                href="#demo-video"
                className="flex min-h-tap-min w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-ink transition-colors duration-150 hover:text-stone-deep sm:w-auto"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-stone-deep">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Watch 4-Min Film</span>
              </a> */}
            </div>

            {/* Trust and Engineering Invariants Strip */}
            <div className="mt-12 grid grid-cols-2 gap-3 border-y border-sand/70 py-6 sm:grid-cols-4 sm:gap-6">
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-ink sm:text-xl">0 KB Uploaded</span>
                <span className="mt-0.5 text-xs text-ink-soft">100% on-device vision AI</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-ink sm:text-xl">20 Seconds</span>
                <span className="mt-0.5 text-xs text-ink-soft">Auto pocket mode dimming</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-ink sm:text-xl">OpenStreetMap</span>
                <span className="mt-0.5 text-xs text-ink-soft">Human-curated open map</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-ink sm:text-xl">125 Assertions</span>
                <span className="mt-0.5 text-xs text-ink-soft">Audited child-safety checks</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            3. REAL RIDDLE SPOTLIGHT CARD
            ===================================================================== */}
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-sand bg-paper-raised p-6 shadow-md sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-lg bg-sand/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  <SphinxMark className="h-3.5 w-3.5 text-stone-deep" />
                  <span>A Real Generated Riddle</span>
                </div>
                <blockquote className="mt-4 text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">
                  &ldquo;{DEMO_RIDDLE}&rdquo;
                </blockquote>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Generated directly from OpenStreetMap tags on Queen Square, Bristol:{" "}
                  <code className="rounded bg-sand/60 px-1.5 py-0.5 text-xs font-mono text-ink">
                    historic=memorial, memorial=war_memorial, inscription=1919
                  </code>
                  . You put your phone away, walk to find it with a grown-up, and learn something true about where you stand.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-sand/80 bg-paper p-4 text-xs sm:w-64">
                <div className="font-semibold text-ink">The In-Game Loop</div>
                <div className="flex items-center gap-2 text-ink-soft">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sand font-mono text-[10px] text-ink font-bold">1</span>
                  <span>Riddle appears on screen</span>
                </div>
                <div className="flex items-center gap-2 text-ink-soft">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sand font-mono text-[10px] text-ink font-bold">2</span>
                  <span>Screen dims after 20 seconds</span>
                </div>
                <div className="flex items-center gap-2 text-ink-soft">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sand font-mono text-[10px] text-ink font-bold">3</span>
                  <span>Walk to destination outdoors</span>
                </div>
                <div className="flex items-center gap-2 text-ink-soft">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-found font-mono text-[10px] text-paper font-bold">&check;</span>
                  <span className="font-medium text-ink">Fact revealed locally</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. YOUTUBE DEMO FILM SHOWCASE (User Requested: https://youtu.be/5VDXL1FvSP8)
            ===================================================================== */}
        <section id="demo-video" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-sand bg-paper-raised px-3.5 py-1 text-xs font-semibold text-ink-soft">
                <span>CINEMATIC WALKTHROUGH</span>
                <span className="text-sand">&bull;</span>
                <span className="text-stone-deep">4 MIN 18 SEC</span>
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
                See Sphinx in Action
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-ink-soft sm:text-lg">
                Watch the full narrated film: live hunt building across Ahmedabad and Bristol, on-device photo verification,
                pocket mode screen dimming, and the OpenStreetMap map-repair twist.
              </p>
            </div>

            {/* Cinema Video Player Container */}
            <div className="mt-10 overflow-hidden rounded-3xl border border-sand bg-paper-raised p-2.5 shadow-xl sm:p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-pocket">
                {!isVideoPlaying ? (
                  /* Video Facade: 0 Network Calls on Initial Load, Plays on Demand */
                  <div className="group relative flex h-full w-full items-center justify-center">
                    <img
                      src="/video-poster.jpg"
                      alt="Sphinx Walkthrough Demo Video Thumbnail"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                      loading="lazy"
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-pocket/90 via-pocket/40 to-pocket/20" />

                    {/* Top overlay badges */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="rounded-md bg-pocket/80 px-2.5 py-1 text-xs font-semibold text-paper backdrop-blur-xs">
                        Sphinx: Explainer Film
                      </span>
                      <span className="rounded-md bg-stone-deep/90 px-2 py-1 text-xs font-mono font-bold text-paper">
                        4:18
                      </span>
                    </div>

                    {/* Play Button Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsVideoPlaying(true)}
                      aria-label="Play Sphinx explainer film"
                      className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-stone-deep text-paper shadow-2xl transition-all duration-200 hover:scale-110 hover:bg-ink active:scale-95 focus-visible:outline-4 focus-visible:outline-paper"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-9 w-9">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>

                    {/* Bottom overlay text */}
                    <div className="absolute right-4 bottom-4 left-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-sm font-semibold text-paper sm:text-base">
                          Live walkthrough on real OpenStreetMap data
                        </p>
                        <p className="text-xs text-pocket-ink">
                          Narrated by the team · 0 synthetic mockups · Zero cross-origin tracking on load
                        </p>
                      </div>
                      <span className="hidden text-xs font-medium text-paper underline sm:inline">
                        Click to play inline
                      </span>
                    </div>
                  </div>
                ) : (
                  /* YouTube Embed Frame */
                  <iframe
                    src={YOUTUBE_EMBED_URL}
                    title="Sphinx Product Walkthrough on YouTube"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full rounded-2xl border-0"
                  />
                )}
              </div>

              {/* Video Toolbar / External Links */}
              <div className="mt-4 flex flex-col items-center justify-between gap-3 px-2 sm:flex-row">
                <div className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="h-2 w-2 rounded-full bg-found" />
                  <span>Narrated Walkthrough (4m 18s)</span>
                  <span>&bull;</span>
                  <span>1080p 30fps</span>
                </div>

                <div className="flex items-center gap-3">
                  {isVideoPlaying && (
                    <button
                      type="button"
                      onClick={() => setIsVideoPlaying(false)}
                      className="text-xs font-medium text-ink-soft underline hover:text-ink"
                    >
                      Reset Player
                    </button>
                  )}
                  <a
                    href={YOUTUBE_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex min-h-tap-min items-center gap-1.5 rounded-xl border border-sand bg-paper px-4 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-sand/60"
                  >
                    <span>Watch on YouTube</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Video Chapters / Key Highlights Breakdown */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-sand bg-paper-raised p-4 transition-colors duration-150 hover:border-stone/40">
                <span className="text-xs font-mono font-bold text-stone-deep">00:12</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">The Touch Grass Premise</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Screens built to put themselves away: pocket mode dims to near-black after 20 seconds.
                </p>
              </div>
              <div className="rounded-2xl border border-sand bg-paper-raised p-4 transition-colors duration-150 hover:border-stone/40">
                <span className="text-xs font-mono font-bold text-stone-deep">00:30</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">3-Step Pipeline</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Overpass OpenStreetMap ingestion &rarr; Tinker LoRA model generation &rarr; Offline IndexedDB cache.
                </p>
              </div>
              <div className="rounded-2xl border border-sand bg-paper-raised p-4 transition-colors duration-150 hover:border-stone/40">
                <span className="text-xs font-mono font-bold text-stone-deep">01:05</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">Live Ahmedabad Hunt</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Generated live with zero cherry-picking across stepwells, stone monuments, and plaques.
                </p>
              </div>
              <div className="rounded-2xl border border-sand bg-paper-raised p-4 transition-colors duration-150 hover:border-stone/40">
                <span className="text-xs font-mono font-bold text-stone-deep">02:05</span>
                <h3 className="mt-1 text-sm font-semibold text-ink">The Map-Fixing Twist</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Tapping &ldquo;It&rsquo;s gone&rdquo; drafts an anonymous OpenStreetMap Note for volunteer cartographers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            5. HOW IT WORKS (Unicorn Bento Grid)
            ===================================================================== */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-sand/70 bg-paper-raised/40 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                SIMPLE, SAFE ARCHITECTURE
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                How Sphinx Works
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-ink-soft sm:text-lg">
                Engineered for children and families. Everything is designed to make screen time as short as possible.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Step 1 */}
              <div className="flex flex-col justify-between rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand/60 font-mono text-lg font-bold text-ink">
                    01
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">Give it Any Place</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Sphinx queries the OpenStreetMap database for real, physical memorials, blue plaques, drinking
                    water fountains, and sculptures in your area.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-sand/80 bg-paper p-3 text-xs text-ink-soft">
                  Adaptive radius sweeps 500m to 2.2km until enough candidate objects exist.
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col justify-between rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand/60 font-mono text-lg font-bold text-ink">
                    02
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">Adult Reads Every Riddle</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    A parent reviews every generated riddle and historical fact on one screen. Nothing starts until a
                    grown-up approves the walk.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-sand/80 bg-paper p-3 text-xs text-ink-soft">
                  Under-12 age gate &amp; automated wayfinding lints protect every stop.
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col justify-between rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand/60 font-mono text-lg font-bold text-ink">
                    03
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">Walk With Signal Off</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    The entire walk is stored offline in IndexedDB. Turn on airplane mode, put the phone in your pocket,
                    and walk to the target together.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-sand/80 bg-paper p-3 text-xs text-ink-soft">
                  Pocket mode dims screen to near-black after 20s to prevent walking-while-scrolling.
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col justify-between rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand/60 font-mono text-lg font-bold text-ink">
                    04
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">Local Photo Check</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    When you find the object, snap a photo. An on-device CLIP model checks it right in your browser.
                    Zero photos are ever uploaded.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-sand/80 bg-paper p-3 text-xs text-ink-soft">
                  Transformers.js WebAssembly inference ensures complete offline privacy.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            6. THE TWIST (Map Repair Showcase)
            ===================================================================== */}
        <section id="the-twist" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-3xl border border-sand bg-stone-deep p-8 text-paper shadow-xl sm:p-12">
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div>
                  <span className="inline-block rounded-md bg-paper/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-sand">
                    THE PEDAGOGICAL TWIST
                  </span>
                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Playing the game fixes the map of Earth.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-sand/90">
                    What happens when a riddle leads to a drinking water fountain that was removed last year?
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-paper">
                    The player taps <strong className="underline decoration-found underline-offset-4">&ldquo;It&rsquo;s gone&rdquo;</strong>.
                    Sphinx files a polite, structured OpenStreetMap Note for volunteer cartographers.
                  </p>
                  <blockquote className="mt-6 border-l-2 border-found pl-4 text-lg font-semibold italic text-paper">
                    &ldquo;You found something the map got wrong.&rdquo;
                  </blockquote>
                  <p className="mt-2 text-xs text-sand">
                    Never framed as a player failure. It teaches children that the map is made by human beings and can be improved.
                  </p>
                </div>

                {/* Mockup of the Draft Note */}
                <div className="rounded-2xl border border-paper/20 bg-paper p-6 text-ink shadow-2xl">
                  <div className="flex items-center justify-between border-b border-sand pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-deep">
                      Draft OpenStreetMap Note
                    </span>
                    <span className="rounded bg-sand/60 px-2 py-0.5 text-[10px] font-mono font-medium text-ink">
                      Human review required
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs leading-relaxed text-ink-soft">
                    <p className="font-mono text-ink">
                      Drinking water reported missing at 51.4503° N, 2.5971° W.
                    </p>
                    <p>
                      &ldquo;The drinking water mapped here was checked on foot on 2026-10-11. It could not be located.&rdquo;
                    </p>
                  </div>
                  <div className="mt-5 rounded-xl bg-sand/40 p-3 text-[11px] text-ink-soft">
                    <span className="font-semibold text-ink">Privacy Guarantee:</span> No photo, no child name, and no account is ever attached. A grown-up confirms and sends it.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            7. SAFETY & PRIVACY CHARTER (Unicorn Trust Matrix)
            ===================================================================== */}
        <section id="safety" className="scroll-mt-20 border-t border-sand/70 bg-paper py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                CHILD SAFETY &amp; DATA INTEGRITY
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Why Parents Can Say Yes
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-ink-soft sm:text-lg">
                We believe games for children should respect their physical safety, privacy, and attention.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Privacy Pillar */}
              <div className="rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand/60 text-ink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">Provable Privacy</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  <li>&bull; Photos &amp; GPS never leave the smartphone.</li>
                  <li>&bull; No accounts, no logins, and zero advertising cookies.</li>
                  <li>&bull; No remote fonts, analytics, or third-party tracking scripts.</li>
                </ul>
                <a
                  href="/privacy"
                  className="mt-4 inline-flex items-center text-xs font-semibold text-stone-deep underline underline-offset-4 hover:text-ink"
                >
                  Read the verifiable privacy audit &rarr;
                </a>
              </div>

              {/* Physical Safety Pillar */}
              <div className="rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand/60 text-ink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">Physical &amp; Stranger Safety</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  <li>&bull; Automated lint forbids movement instructions (&ldquo;cross road&rdquo;, &ldquo;turn left&rdquo;).</li>
                  <li>&bull; Target objects must be on public footpaths, never private land.</li>
                  <li>&bull; Built-in safety script protects against stranger approaches.</li>
                </ul>
                <a
                  href="/parent"
                  className="mt-4 inline-flex items-center text-xs font-semibold text-stone-deep underline underline-offset-4 hover:text-ink"
                >
                  View Parent Safety Guide &rarr;
                </a>
              </div>

              {/* Anti-Engagement Pillar */}
              <div className="rounded-3xl border border-sand bg-paper-raised p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand/60 text-ink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">Anti-Engagement by Design</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  <li>&bull; No streaks, badges, confetti, or XP animations.</li>
                  <li>&bull; No infinite scrolling or push notifications.</li>
                  <li>&bull; Screen dims to pocket mode after 20 seconds.</li>
                </ul>
                <span className="mt-4 inline-block text-xs font-medium text-found">
                  Metric: time-to-pocket, not time-in-app
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. INSTALL & GET SPHINX (PWA & Stores)
            ===================================================================== */}
        <section id="install" className="scroll-mt-20 border-t border-sand/70 bg-paper-raised/40 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-3xl border border-sand bg-paper-raised p-6 shadow-lg sm:p-10">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  Install Sphinx on Your Device
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">
                  Sphinx is a Progressive Web App (PWA). It installs directly from your web browser, saves walks
                  to local device memory, and runs without internet in airplane mode.
                </p>
              </div>

              {/* One-Click Install Button (Chromium / Supported Browsers) */}
              <div className="mt-8 flex justify-center">
                <div className="w-full max-w-sm">
                  <InstallButton />
                </div>
              </div>

              {/* App Store Status Badges */}
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <StoreBadge store="apple" href={distribution.appStoreUrl || undefined} />
                <StoreBadge store="google" href={distribution.playStoreUrl || undefined} />
              </div>

              {!hasStoreListings && (
                <p className="mt-3 text-center text-xs text-ink-soft">
                  Sphinx is currently distributed as an open PWA. Native store packages are in review.
                </p>
              )}

              {/* Platform Installation Guide Tabs */}
              <div className="mt-8 border-t border-sand pt-6">
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveInstallTab("ios")}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-150 ${
                      activeInstallTab === "ios"
                        ? "bg-stone-deep text-paper"
                        : "bg-paper text-ink-soft hover:text-ink"
                    }`}
                  >
                    iPhone &amp; iPad
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInstallTab("android")}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-150 ${
                      activeInstallTab === "android"
                        ? "bg-stone-deep text-paper"
                        : "bg-paper text-ink-soft hover:text-ink"
                    }`}
                  >
                    Android
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInstallTab("desktop")}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-150 ${
                      activeInstallTab === "desktop"
                        ? "bg-stone-deep text-paper"
                        : "bg-paper text-ink-soft hover:text-ink"
                    }`}
                  >
                    Desktop (Chrome/Edge)
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-sand bg-paper p-4 text-xs leading-relaxed text-ink-soft">
                  {activeInstallTab === "ios" && (
                    <p>
                      <strong className="font-semibold text-ink">iOS Safari:</strong> Tap the{" "}
                      <span className="font-semibold text-ink">Share</span> button in Safari, scroll down and tap{" "}
                      <span className="font-semibold text-ink">Add to Home Screen</span>. Sphinx will appear as an app icon
                      and launch in full-screen offline mode.
                    </p>
                  )}
                  {activeInstallTab === "android" && (
                    <p>
                      <strong className="font-semibold text-ink">Android Chrome:</strong> Tap the{" "}
                      <span className="font-semibold text-ink">Install app</span> button above or open the Chrome menu (three dots)
                      and select <span className="font-semibold text-ink">Install app / Add to Home screen</span>.
                    </p>
                  )}
                  {activeInstallTab === "desktop" && (
                    <p>
                      <strong className="font-semibold text-ink">Chrome or Edge:</strong> Click the{" "}
                      <span className="font-semibold text-ink">Install Sphinx</span> icon in the browser address bar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            9. CALL TO ACTION STRIP
            ===================================================================== */}
        <section className="border-t border-sand/70 bg-paper py-16 text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Ready to explore your neighbourhood?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-ink-soft">
              Start with the baked Bristol demo hunt or build a live walk around your own street in seconds.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/build"
                className="flex min-h-tap-primary w-full items-center justify-center gap-2 rounded-2xl bg-stone-deep px-8 text-action text-paper shadow-md transition-colors duration-150 hover:bg-ink sm:w-auto"
              >
                <span>Build a Walk Near You</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
              <a
                href="/play/demo"
                className="flex min-h-tap-primary w-full items-center justify-center rounded-2xl border-2 border-stone bg-paper-raised px-8 text-action text-ink transition-colors duration-150 hover:bg-sand/60 sm:w-auto"
              >
                Play Bristol Demo Walk
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          10. FOOTER
          ===================================================================== */}
      <footer className="border-t border-sand bg-paper-raised py-12 text-sm text-ink-soft">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
            {/* Brand column */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="flex items-center gap-2">
                <img src="/icon.svg" alt="" width={24} height={24} className="h-6 w-6 opacity-90" />
                <span className="font-bold tracking-tight text-ink">{app.name}</span>
              </div>
              <p className="mt-2 max-w-xs text-xs text-ink-soft">{app.tagline}</p>
              <p className="mt-1 text-[11px] text-ink-soft">
                Photos and location stay on device. Zero tracking.
              </p>
            </div>

            {/* Links column */}
            <div className="flex flex-wrap justify-center gap-8 text-xs font-medium text-ink">
              <a href="/build" className="hover:underline">Build Walk</a>
              <a href="/play/demo" className="hover:underline">Demo Walk</a>
              <a href="/parent" className="hover:underline">Parent Panel</a>
              <a href="/privacy" className="hover:underline">Privacy Note</a>
              <a href={YOUTUBE_URL} target="_blank" rel="noreferrer noopener" className="hover:underline">
                YouTube Walkthrough
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-sand/70 pt-8 text-center text-xs text-ink-soft sm:flex-row">
            <OsmAttribution />
            <p className="text-[11px]">
              Built for Hacktoberfest 2026 &bull; Touch Grass AI Challenge
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}