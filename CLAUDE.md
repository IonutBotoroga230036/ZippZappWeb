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
assets/js/tilt.js     initTilt(); pointer-driven 3D tilt on every [data-tilt]
assets/js/main.js     FAQ accordion, partner form, mobile nav
assets/fonts/         NIKEA.woff2 (used) + NIKEA.otf (source)
assets/img/           logo PNGs + the two product renders (.webp) the page uses;
                      pack-black.png / pack-white.png are superseded and unreferenced
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

`.actbreak` sets its own tokens locally — paper surface, ink text, `--volt-deep` accent — so it renders on light ground regardless of the acts either side of it. It is the same paper as act two; what separates the two is the wave field, not a tonal step.

**The act break is a curtain reveal that releases into act two's hero.** `.reveal` is pulled up under act one's last screenful by `margin-top:-100dvh`, and `.actbreak` inside it is `position:sticky; top:0`. Act one carries `position:relative; z-index:1` and paints over it, so scrolling lifts act one away and uncovers a stationary panel; the panel then unpins and scrolls on as act two's hero. The whole thing is CSS — no JS, no scroll listener.

**`.reveal`'s height must stay exactly `100dvh` more than the overlap its negative margin creates.** At `height:200dvh` / `margin-top:-100dvh`, the panel unpins on precisely the frame act one's bottom edge clears the viewport, so the curtain finishing and the release are the same moment. That coincidence falls out of the geometry rather than a tuned number, which is why it must be maintained as a pair: raising `height` alone reintroduces a hold with the copy welded to the viewport — measured at 450px, unmoving, across 1530px of scroll before this was replaced — and lowering it unpins the panel while act one is still lifting away.

**The band's `id` belongs on `.reveal`, not the panel.** An `id` on a pinned element resolves to wherever the viewport happens to be, which is what made the "For venues" nav link a silent no-op for as long as the panel was `position:fixed`. `.reveal` carries `scroll-margin-top:-100dvh` to land the jump on the fully uncovered panel; the value is negative because `scroll-margin` grows the target box upward, so a positive one lands it a full screen early.

Both fallbacks (`max-width:900px` and `prefers-reduced-motion`) must reset `margin-top:0` alongside `height:auto`. Resetting only the height leaves the wrapper pulled up over the pricing section.

**Wave fields are instantiated per element.** `waves.js` exposes `initWaveField(mount)` and calls it for every `[data-waves]`. There are currently two (hero, act break); adding a third is a markup change only. Each field:
- pauses its RAF loop via `IntersectionObserver` when scrolled out of view — verified that only the visible one runs
- renders exactly one static frame under `prefers-reduced-motion` and never schedules again
- tracks the cursor in **viewport** coordinates (never add `scrollY` — that was a v3 bug that made the cursor hotspot drift on scroll)

**Product imagery tilts toward the cursor, per element.** `tilt.js` binds `initTilt()` to every `[data-tilt]` container and rotates the `img` (or `[data-tilt-target]`) inside it. Like the wave fields, it is instantiated per element and adding another is a markup change only. Its constraints:
- travel and lag are per-instance via `data-tilt-max` / `data-tilt-ease`, because a heavy object should move less and lag more than a light one — the pack uses the 9°/0.12 defaults, the kiosk is dialled down to 5°/0.08
- rotation is **clamped** to `MAX_DEG`, not merely scaled by it; a pointer reported outside the box would otherwise drive it far past the limit
- the RAF loop stops once the tilt settles flat, and clears the inline `transform` so the element goes back to CSS control — do not leave a transform pinned at rest
- it binds nothing at all under `prefers-reduced-motion`, or on anything without `(hover:hover) and (pointer:fine)`; touch gets the static image by design
- pointer coordinates are **viewport** coordinates measured against a live `getBoundingClientRect()` — the same rule as the wave fields, and for the same reason

**Colour is single-source.** `--volt-rgb` is the one place the brand purple is defined; `--volt` and `--volt-tint` derive from it. Do not write a literal `rgba(183,148,255,…)` anywhere — the v3 prototype had a recolour go stale exactly that way.

**Muted body copy is `--ink-50` at 0.62 alpha, not 0.52.** At 0.52 it measured 3.93:1 on paper and failed WCAG AA. Measure computed colour against the real section background when changing it; do not eyeball.

**Contrast sweeps must include the footer.** Several passes scanned only `.act` and `.actbreak` and so missed a footer failure at 3.77:1 that had been shipping for weeks. Query the whole document, not the acts.

**Every divider strand's `stroke-dasharray` must sum to 480.** The strands share one `@keyframes` that offsets `stroke-dashoffset` by `-960`, exactly two periods. Vary the dash-to-gap ratio to change strand length — `150 330`, `90 390`, `210 270` — but never the sum. A strand whose period does not divide the offset visibly jumps every time the animation loops. The two spine strands carry `stroke-dasharray:none` and are exempt; with no dashes, `dashoffset` does nothing, so they are static by construction.

**Radii come from three tokens plus pills.** `--radius-sm` (10px) for chips, inputs and badges; `--radius` (18px) for cards, plates and panels; `--radius-lg` (28px) for the partner panel; `999px` for anything that reads as a pill. Do not introduce a fourth value — the system previously had both 9px and 10px doing the same job for no reason.

## Typography constraint

Nikea (by Limitype) is **free for personal and commercial use** — confirmed by the project owner.

**Nikea is uppercase-only.** Lowercase codepoints render as cap forms, so it is confined to `h1`/`h2` with an explicit `text-transform:uppercase` (which also keeps the Inter fallback in caps if the font fails). `h3`/`h4`, FAQ questions and card headings deliberately use **Inter** — all-caps at body scale hurts readability.

## Content rule

Everything on the page must be true. The v3 prototype shipped invented traction (venue counts, rental totals, uptime figures, named testimonials); these were removed rather than reworded. The hero stat bar states **terms of the offer**, not results. If a number cannot be substantiated, cut the claim rather than soften it.

## Known gaps

- **Both product images are renders, not photographs.** `zipp_zapp_powerbank_front.webp` (act one) and `zippzapp_powerbank_kiosk_transparent.webp` (act two) are CG — confirmed by the project owner. Real photography is still blocked on physical devices being ordered. The slots are `.product__plate--bare` containers referenced once per act, so swapping them is a file drop, not a layout change.
- **There is still no photography of a station *in situ*** — a kiosk render on a blank ground is not a station in a real café, and that remains the biggest gap on the venue side. Do not treat the kiosk render as closing it.
- `pack-black.png` / `pack-white.png` are the earlier stand-ins and are now referenced nowhere in HTML, CSS or JS. They are kept as files only; delete or reinstate deliberately rather than reaching for them by habit.
- The partner form has no backend and says so on the page.
- Every "Get the app" CTA anchors to `#download` in the footer — there are no real store links yet.
