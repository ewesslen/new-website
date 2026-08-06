# Erik Wesslen — personal site

A personal hub for a solo founder running several ventures in parallel.
Built with [Astro](https://astro.build), TypeScript, hand-written CSS, and
GSAP for motion — layered as a strict progressive enhancement over a site
that is complete without it.

## Run

```sh
npm install
npm run dev        # local dev server at http://localhost:4321
npm run build      # static build → dist/
npm run preview    # serve the built site locally
```

## Verify

```sh
npm run contrast   # WCAG 2.2 AA contrast check for the token palette
npm run build && npm run a11y       # axe scan of every page, light + dark
npm run build && npm run keyboard   # automated keyboard walkthrough:
                   # skip link first + working, tab order = DOM order,
                   # visible focus indicator on every stop, no traps
npm run check      # astro/TypeScript check
npm run og         # regenerate public/og.png from scripts/og.html
```

## Deploy

The build output in `dist/` is fully static — deploy to Vercel or Netlify
with zero config:

- **Vercel**: import the repo; framework preset "Astro" is auto-detected.
- **Netlify**: build command `npm run build`, publish directory `dist`.

Once the domain is decided, set `site` in `astro.config.mjs` — the
canonical link, `og:url`, and `og:image`/Twitter-card tags light up
automatically (they're gated so no broken relative URLs ship before then).

The social preview image is `public/og.png`, generated from
`scripts/og.html` — after changing the name or tagline, keep that file in
sync with `src/data/site.ts` and re-run `npm run og`.

## Filling in the TODOs

Everything marked `TODO` lives in **`src/data/site.ts`** — one file:

- [ ] `tagline` — three positioning-line options are in the comment; pick one:
  1. "One person. Several bets." *(currently live)*
  2. "Building several things at once — on purpose."
  3. "The portfolio is the point."
- [ ] Trellais URL
- [ ] Panodash GitHub URL
- [ ] Stacking Sense URL
- [ ] MWCAPCON URL
- [ ] Geeqoid URL
- [ ] YouTube URL — the last empty entry in `SOCIALS`, which drives the
      footer icon row (GitHub, LinkedIn, X, Instagram, and Facebook are
      filled in). Clearing a url hides that icon; to add a platform, add an
      entry plus its glyph in `src/components/SocialIcon.astro`.
- [ ] `NEWSLETTER.formAction` — Beehiiv embed-form action URL (renders an
      inline subscribe form) and/or `subscribeUrl` (fallback link).
      Also confirm the subscribe target is Stacking Sense.

Links render only when a URL is present — nothing is ever a dead link, so
partially filled data is always safe to ship.

## Wiring real writing feeds

Placeholder posts live in `POSTS` in `src/data/site.ts`. To swap in a real
feed later, replace that array with a build-time fetch — e.g. in
`src/pages/index.astro`'s frontmatter, fetch the Beehiiv RSS feed and map it
to the same `Post` shape (`title`, `date`, `readMinutes`, `url`). Astro runs
frontmatter at build time, so the site stays fully static. The `PostItem`
component needs no changes.

## Structure

```
src/
  data/site.ts        ← all content + TODOs (start here)
  layouts/Base.astro   ← <head>, header/nav, footer, skip link
  components/          ← VentureCard, MediaItem, PostItem, SocialIcon
  pages/index.astro    ← the one-pager
  pages/writing.astro  ← "view all" writing page
  styles/global.css    ← design tokens, type scale, all styling
scripts/
  contrast.mjs         ← WCAG contrast check for the palette
  a11y.mjs             ← axe scan of the built site
```

## Motion architecture

Motion state is a single attribute, `data-motion="on|off"` on `<html>`,
set **pre-paint** by an inline script in `src/layouts/Base.astro`:
an explicit choice (localStorage, set by the header's Motion toggle) wins,
otherwise the OS `prefers-reduced-motion` setting decides. Everything keys
off that one state:

- **CSS**: all transition durations run through `--dur-*` custom
  properties that collapse to `0s` when motion is off — state changes
  (hover colors, borders) still happen, instantly. The hover lift distance
  is a variable (`--lift`) that collapses to `0px`.
- **JS** (`src/scripts/motion.ts`, the only client JS on the site):
  GSAP + ScrollTrigger reveals, the kinetic variable-font hero, magnetic
  elements, and card spotlights — all check the attribute and tear down
  cleanly when toggled off.
- **View transitions** are *cross-document* (CSS `@view-transition`) —
  real page navigations with native focus/history semantics; no client
  router. Disabled under reduced motion; instant when toggled off.
- **Lenis / scroll hijacking is deliberately not used** — CSS
  `scroll-behavior: smooth` (gated on motion state) covers anchor jumps
  without touching native scrolling.

Safety properties, verified by `npm run a11y` and `npm run keyboard` in
both motion states:

- Reveals animate `opacity`/`transform` only — content never leaves the
  accessibility tree, and under reduced motion everything is simply
  present, immediately.
- Reveal targets are pre-hidden only while `motion-pending` is set; a
  failsafe timeout removes it, so a failed JS load can never hide content.
- A `focusin` listener completes any reveal a keyboard user tabs into —
  focus is never on an invisible element (asserted in the keyboard test).
- The hero letter animation locks letter widths during its weight wave and
  metric-matched font fallbacks (`size-adjust`/`ascent-override`) cover the
  webfont swap — measured CLS ≈ 0.
- The motion bundle (~47 KB gz) is a deferred module; first paint never
  waits on it.

## Browser support

Evergreen browsers get everything. Older browsers degrade by design:
`color-mix()` accents fall back to solid colors, `@view-transition`
(Chrome/Edge, Safari 18.2+) falls back to normal navigation, `inset` has
longhand fallbacks, and `:focus-visible`-less browsers keep their native
focus rings (outlines are never removed). No polyfills shipped.

## Accessibility ground rules (all phases)

- Semantic landmarks, one `h1` per page, correct heading order.
- Skip link, `:focus-visible` styles, logical tab order.
- WCAG 2.2 AA contrast — per-venture accent colors have separate
  light/dark-mode values tuned to pass on their backgrounds
  (see `scripts/contrast.mjs`).
- `prefers-color-scheme`, `forced-colors`, and `prefers-reduced-data`
  (falls back to system fonts) respected; `prefers-reduced-motion` will
  gate all motion added in later phases.
- Small-text links carry extra padding to meet WCAG 2.5.8 target size.
- No client-side JS required for any content or navigation.
