# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ZippZapp — landing page for a **power bank rental network**. Stations are placed in venues (cafés, bars, hotels, gyms) on a free-install revenue-share deal; consumers rent packs by the hour through an app. The page sells primarily to **venue owners**, secondarily to renters.

## Stack

Static HTML/CSS/JS. **No build step, no framework, no package manager.** Files are served as-is.

```
index.html            single page, all sections
assets/css/style.css  all styling, token-driven
assets/js/waves.js    hero background wave field + makeNoise2D (must load first)
assets/js/bolt.js     the wave-built logo mark (depends on makeNoise2D from waves.js)
assets/js/main.js     FAQ accordion, partner form, mobile nav
assets/fonts/         NIKEA.woff2 (used) + NIKEA.otf (source)
assets/img/           logo PNGs
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

**Two independent wave fields, one shared noise function.** `waves.js` declares `makeNoise2D` at global scope and runs the hero background field (vertical lines, ~150 paths). `bolt.js` reuses that global for the logo mark (horizontal lines, 31 paths, clipped to a bolt silhouette). Script order in `index.html` matters — `waves.js` must come before `bolt.js`.

Both fields:
- pause their RAF loop via `IntersectionObserver` when scrolled out of view
- render exactly one static frame under `prefers-reduced-motion` and never schedule again
- track the cursor in **viewport** coordinates (never add `scrollY` — that was a bug in the v3 prototype that made the cursor hotspot drift on scroll)

**The mark is the wave.** The real ZippZapp logo is a lightning bolt built from stacked wavy stripes. The hero mark is therefore *drawn live* rather than placed as an image: a `<clipPath>` of the bolt over a field of animated lines. The bolt path is duplicated in `index.html` (once for the clip, once for the `.bolt-fill` wash) — keep the two `d` values in sync.

**Colour is single-source.** `--volt-rgb` is the one place the brand purple is defined; `--volt` and `--volt-tint` derive from it. Do not write a literal `rgba(183,148,255,…)` anywhere — the v3 prototype had a recolour go stale exactly that way.

## Typography constraint

Nikea (by Limitype) is **free for personal and commercial use** — confirmed by the project owner.

**Nikea is uppercase-only.** Lowercase codepoints render as cap forms, so it is confined to `h1`/`h2` with an explicit `text-transform:uppercase` (which also keeps the Inter fallback in caps if the font fails). `h3`/`h4`, FAQ questions and card headings deliberately use **Inter** — all-caps at body scale hurts readability.

## Content rule

Everything on the page must be true. The v3 prototype shipped invented traction (venue counts, rental totals, uptime figures, named testimonials); these were removed rather than reworded. The hero stat bar states **terms of the offer**, not results. If a number cannot be substantiated, cut the claim rather than soften it.

## Known gaps

- The stations/placement map SVG is decorative; its six pins can still read as a coverage claim.
- The partner form has no backend and says so on the page.
- Every "Get the app" CTA anchors to `#download` in the footer — there are no real store links yet.
