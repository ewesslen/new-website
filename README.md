# Erik — personal site

A personal hub for a solo founder running several ventures in parallel.
Built with [Astro](https://astro.build), TypeScript, and hand-written CSS.
Zero client-side JavaScript in the current phase; motion arrives later as a
progressive enhancement.

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
```

## Deploy

The build output in `dist/` is fully static — deploy to Vercel or Netlify
with zero config:

- **Vercel**: import the repo; framework preset "Astro" is auto-detected.
- **Netlify**: build command `npm run build`, publish directory `dist`.

Once the domain is decided, set `site` in `astro.config.mjs` (used for
canonical/OG URLs).

## Filling in the TODOs

Everything marked `TODO` lives in **`src/data/site.ts`** — one file:

- [ ] `lastName` — last name for the hero + page titles
- [ ] `tagline` — three positioning-line options are in the comment; pick one:
  1. "One person. Several bets." *(currently live)*
  2. "Building several things at once — on purpose."
  3. "The portfolio is the point."
- [ ] Trellais URL
- [ ] Panodash GitHub URL
- [ ] Stacking Sense URL
- [ ] MWCAPCON URL
- [ ] Geeqoid URL
- [ ] Social links (X, GitHub, LinkedIn, email)
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
  components/          ← VentureCard, MediaItem, PostItem
  pages/index.astro    ← the one-pager
  pages/writing.astro  ← "view all" writing page
  styles/global.css    ← design tokens, type scale, all styling
scripts/
  contrast.mjs         ← WCAG contrast check for the palette
  a11y.mjs             ← axe scan of the built site
```

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
