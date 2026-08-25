# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ZippZapp — landing page for a **power bank rental network**. Stations are placed in venues (cafés, bars, hotels, gyms) on a free-install revenue-share deal; consumers rent packs by the hour through an app. The page sells primarily to **venue owners**, secondarily to renters.

## Stack

Static HTML/CSS/JS. **No build step, no framework, no package manager.** Files are served as-is.

```
index.html            single page, two audience acts
assets/css/style.css  all styling, token-driven
assets/js/waves.js    initWaveField() + makeNoise2D; binds to every [data-waves]
assets/js/main.js     FAQ accordion, partner form, mobile nav
assets/fonts/         NIKEA.woff2 (used) + NIKEA.otf (source)
assets/img/           logo PNGs + pack-black.png / pack-white.png
versions/             version_1/2/3.html — original prototypes, archived reference only
tools/serve.ps1       local static server
```

## Running it

This machine has **no node and no python**, so previewing uses a PowerShell/.NET static server:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1
```

Serves `http://localhost:8080`. `.claude/launch.json` wires this up for the preview pane (`preview_start` with name `zippzapp`).

**Do not open `index.html` via `file://`** — the preview pane converts it to a `data:` URL, which breaks every relative path and renders the page unstyled. Always go through the server.

## Architecture notes

**The page is two acts, one per audience.** Act one (`.act--dark`) is the renter story: hero, how it works, the pack, pricing. An act-break band hands over to act two (`.act--light`), the venue-owner story: why host, revenue split, placement, apply form. This exists because the page previously alternated audiences and lost both — a café owner would hit a $9.99 consumer subscription mid-pitch.

**Acts flip design tokens; components never hardcode colour.** `.act--dark` and `.act--light` redefine `--surface`, `--on-surface`, `--on-surface-70/50`, `--rule` and `--accent`. Components read *those*, so the same component renders correctly in either act. This is load-bearing, not tidiness: `.steps`, `.section-head`, `.faq-q`, `.eyebrow` and `.stats` all appear in **both** acts. Adding a component that hardcodes `var(--ink)` or `#fff` will break the moment it moves act.

`.actbreak` sets its own dark tokens locally so it stays dark regardless of the acts either side of it.

**Wave fields are instantiated per element.** `waves.js` exposes `initWaveField(mount)` and calls it for every `[data-waves]`. There are currently two (hero, act break); adding a third is a markup change only. Each field:
- pauses its RAF loop via `IntersectionObserver` when scrolled out of view — verified that only the visible one runs
- renders exactly one static frame under `prefers-reduced-motion` and never schedules again
- tracks the cursor in **viewport** coordinates (never add `scrollY` — that was a v3 bug that made the cursor hotspot drift on scroll)

**Colour is single-source.** `--volt-rgb` is the one place the brand purple is defined; `--volt` and `--volt-tint` derive from it. Do not write a literal `rgba(183,148,255,…)` anywhere — the v3 prototype had a recolour go stale exactly that way.

**Muted body copy is `--ink-50` at 0.62 alpha, not 0.52.** At 0.52 it measured 3.93:1 on paper and failed WCAG AA. Measure computed colour against the real section background when changing it; do not eyeball.

## Typography constraint

Nikea (by Limitype) is **free for personal and commercial use** — confirmed by the project owner.

**Nikea is uppercase-only.** Lowercase codepoints render as cap forms, so it is confined to `h1`/`h2` with an explicit `text-transform:uppercase` (which also keeps the Inter fallback in caps if the font fails). `h3`/`h4`, FAQ questions and card headings deliberately use **Inter** — all-caps at body scale hurts readability.

## Content rule

Everything on the page must be true. The v3 prototype shipped invented traction (venue counts, rental totals, uptime figures, named testimonials); these were removed rather than reworded. The hero stat bar states **terms of the offer**, not results. If a number cannot be substantiated, cut the claim rather than soften it.

## Known gaps

- `pack-black.png` / `pack-white.png` are **product renders standing in for real photography**, which is blocked on physical devices being ordered. The slots are fixed-aspect `.product__plate` containers referenced once per act, so swapping them is a file drop, not a layout change. Showing both finishes implies two SKUs exist — worth confirming.
- There is no photography of a station *in situ*, which is the biggest remaining gap on the venue side.
- The partner form has no backend and says so on the page.
- Every "Get the app" CTA anchors to `#download` in the footer — there are no real store links yet.
