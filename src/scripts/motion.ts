/**
 * Motion layer — progressive enhancement only.
 *
 * The site is complete and fully usable before this module runs. State
 * lives in `data-motion` on <html>, set pre-paint by the inline script in
 * Base.astro (localStorage override, else OS preference). This module:
 *
 *  - wires the visible motion toggle (persists explicit choice)
 *  - hero: letter-split wipe-in with a variable-font weight wave, then a
 *    pointer-proximity weight bulge (fine pointers only)
 *  - scroll reveals via ScrollTrigger, opacity/transform only — content
 *    never leaves the accessibility tree (no visibility:hidden)
 *  - focusin failsafe: tabbing into an unrevealed element completes its
 *    reveal instantly, so keyboard focus is never invisible
 *  - magnetic pull + card spotlight (fine pointers, decoration only)
 *
 * Turning motion OFF tears everything down and clears inline styles.
 * Turning it ON mid-session enables interactive effects only — entrance
 * reveals never re-hide content that is already visible.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const finePointer = window.matchMedia('(pointer: fine)');
const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

const motionOn = (): boolean => html.dataset.motion === 'on';

/** Everything created while motion is on registers its cleanup here. */
let teardowns: Array<() => void> = [];
let interactiveAbort: AbortController | null = null;

/* ---------- Motion state ---------- */

function applyMotionState(on: boolean): void {
  html.dataset.motion = on ? 'on' : 'off';
  document
    .querySelector('[data-motion-toggle]')
    ?.setAttribute('aria-pressed', String(on));
}

function setupToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', String(motionOn()));
  toggle.classList.add('ready');
  toggle.addEventListener('click', () => {
    const next = !motionOn();
    try {
      localStorage.setItem('motion', next ? 'on' : 'off');
    } catch {
      /* private mode — session-only toggle still works */
    }
    applyMotionState(next);
    if (next) enableInteractive();
    else disableAll();
  });

  // Follow OS changes live unless the user made an explicit choice
  osReduced.addEventListener('change', (e) => {
    let explicit: string | null = null;
    try {
      explicit = localStorage.getItem('motion');
    } catch {
      /* ignore */
    }
    if (explicit) return;
    applyMotionState(!e.matches);
    if (e.matches) disableAll();
    else enableInteractive();
  });
}

/* ---------- Cross-document view transitions ----------
   The stylesheet opts in under (prefers-reduced-motion: no-preference).
   This covers the remaining case — OS says reduce but the user explicitly
   turned motion on — which a media query can never express. */

function setupViewTransitionOptIn(): void {
  if (document.getElementById('vt-opt-in')) return;
  if (osReduced.matches && motionOn()) {
    const style = document.createElement('style');
    style.id = 'vt-opt-in';
    style.textContent = '@view-transition { navigation: auto; }';
    document.head.append(style);
  }
}

/* ---------- Hero: kinetic variable-font name ---------- */

/* Familjen Grotesk's wght axis is 400–700, so the h1 rests below the top of
   it: that headroom is what the pointer wave pulls into. Keep REST under
   BULGE — if they meet, the wave silently does nothing. */
const WGHT_START = 400;
const WGHT_REST = 560;
const WGHT_BULGE = 700;

function splitHeroLetters(h1: HTMLElement): HTMLElement[] {
  if (h1.dataset.split) {
    return Array.from(h1.querySelectorAll<HTMLElement>('.hero-letter'));
  }
  const text = h1.textContent?.trim() ?? '';
  h1.setAttribute('aria-label', text);
  h1.dataset.split = 'true';
  h1.textContent = '';
  const letters: HTMLElement[] = [];
  for (const word of text.split(/\s+/)) {
    const wordEl = document.createElement('span');
    wordEl.className = 'hero-word';
    wordEl.setAttribute('aria-hidden', 'true');
    for (const char of word) {
      const mask = document.createElement('span');
      mask.className = 'hero-letter-mask';
      const letter = document.createElement('span');
      letter.className = 'hero-letter';
      letter.textContent = char;
      mask.append(letter);
      wordEl.append(mask);
      letters.push(letter);
    }
    h1.append(wordEl, ' ');
  }
  return letters;
}

async function heroEntrance(): Promise<void> {
  const h1 = document.getElementById('hero-name');
  if (!h1) return;
  const letters = splitHeroLetters(h1);
  const masks = Array.from(h1.querySelectorAll<HTMLElement>('.hero-letter-mask'));
  const tagline = document.querySelector('.hero .tagline');
  const intro = document.querySelector('.hero .intro');

  // Hidden states, applied synchronously before .motion-pending comes off
  gsap.set(letters, { yPercent: 110 });
  if (tagline) gsap.set(tagline, { clipPath: 'inset(0 100% 0 0)' });
  if (intro) gsap.set(intro, { opacity: 0, y: 16 });

  // Measure with the real display font where possible (capped wait)
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
  if (!motionOn()) return; // toggled off while waiting; teardown already ran

  // Lock each mask to its resting-weight width so the weight wave cannot
  // reflow the line — the entrance contributes zero layout shift.
  gsap.set(letters, { '--wght': WGHT_REST });
  for (const mask of masks) mask.style.width = `${mask.getBoundingClientRect().width}px`;
  gsap.set(letters, { '--wght': WGHT_START });

  const unlock = () => {
    for (const mask of masks) mask.style.width = '';
  };
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: unlock });
  tl.to(letters, { yPercent: 0, '--wght': WGHT_REST, duration: 0.75, stagger: 0.045 });
  if (tagline) {
    tl.to(tagline, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: 'power2.inOut' }, '-=0.35');
  }
  if (intro) {
    tl.to(intro, { opacity: 1, y: 0, duration: 0.55 }, '-=0.25');
  }
  teardowns.push(() => {
    tl.kill();
    unlock();
    gsap.set([...letters, tagline, intro].filter((el): el is Element => el != null), {
      clearProps: 'all',
    });
  });
}

/** Pointer-proximity weight bulge. Listeners only on the hero — no global
    rAF loop; completely idle unless the pointer moves over it. */
function heroPointerWave(signal: AbortSignal): void {
  if (!finePointer.matches) return;
  const h1 = document.getElementById('hero-name');
  if (!h1) return;
  const letters = splitHeroLetters(h1);
  if (letters.length === 0) return;

  const quicks = letters.map((el) =>
    gsap.quickTo(el, '--wght', { duration: 0.35, ease: 'power2.out' })
  );
  const reset = () => quicks.forEach((q) => q(WGHT_REST));

  h1.addEventListener(
    'pointermove',
    (e) => {
      if (!motionOn()) return;
      letters.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const t = Math.max(0, 1 - Math.hypot(dx, dy) / 140);
        quicks[i]!(WGHT_REST + (WGHT_BULGE - WGHT_REST) * t * t);
      });
    },
    { signal }
  );
  h1.addEventListener('pointerleave', reset, { signal });
  signal.addEventListener('abort', reset);
}

/* ---------- Scroll reveals ---------- */

interface RevealGroup {
  trigger: string;
  targets: string;
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

const REVEAL_GROUPS: RevealGroup[] = [
  {
    trigger: '.section-head',
    targets: ':scope > *',
    from: { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
    to: { opacity: 1, clipPath: 'inset(0 -2% 0 0)', duration: 0.6, stagger: 0.12, ease: 'power2.inOut' },
  },
  {
    trigger: '.card-grid',
    targets: '.card',
    from: { opacity: 0, y: 26, scale: 0.975, '--bar-scale': 0 },
    to: { opacity: 1, y: 0, scale: 1, '--bar-scale': 1, duration: 0.65, stagger: 0.09, ease: 'power3.out' },
  },
  {
    trigger: '.media-list',
    targets: '.media-item',
    from: { opacity: 0, x: -14 },
    to: { opacity: 1, x: 0, duration: 0.55, stagger: 0.09, ease: 'power2.out' },
  },
  {
    trigger: '.post-list',
    targets: '.post-item',
    from: { opacity: 0, y: 14 },
    to: { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' },
  },
  {
    trigger: '.now-list',
    targets: ':scope > li',
    from: { opacity: 0, x: -10 },
    to: { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' },
  },
];

function setupReveals(): void {
  const completions = new Map<Element, () => void>();

  for (const group of REVEAL_GROUPS) {
    for (const container of document.querySelectorAll(group.trigger)) {
      const targets = Array.from(container.querySelectorAll(group.targets));
      const scoped = targets.length > 0 ? targets : [container];

      // Block CSS hover transitions while GSAP owns the inline styles
      for (const el of scoped) el.classList.add('is-animating');
      gsap.set(scoped, group.from);

      const finish = () => {
        for (const el of scoped) {
          el.classList.remove('is-animating');
          completions.delete(el);
        }
        // Natural styles equal the settled state — drop every inline prop
        gsap.set(scoped, { clearProps: 'all' });
      };
      const tween = gsap.to(scoped, {
        ...group.to,
        onComplete: finish,
        scrollTrigger: { trigger: container, start: 'top 88%', once: true },
      });
      const complete = () => {
        tween.scrollTrigger?.kill();
        tween.progress(1); // fires onComplete → finish()
      };
      for (const el of scoped) completions.set(el, complete);
      teardowns.push(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
        for (const el of scoped) el.classList.remove('is-animating');
        gsap.set(scoped, { clearProps: 'all' });
      });
    }
  }

  // Keyboard failsafe: focus landing inside an unrevealed element finishes
  // its group's reveal immediately — focus is never on invisible content.
  const onFocusIn = (e: FocusEvent) => {
    let node = e.target instanceof Element ? e.target : null;
    while (node) {
      const complete = completions.get(node);
      if (complete) {
        complete();
        return;
      }
      node = node.parentElement;
    }
  };
  document.addEventListener('focusin', onFocusIn);
  teardowns.push(() => document.removeEventListener('focusin', onFocusIn));
}

/* ---------- Magnetic elements ---------- */

function setupMagnetic(signal: AbortSignal): void {
  if (!finePointer.matches) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    el.addEventListener(
      'pointermove',
      (e) => {
        if (!motionOn()) return;
        const rect = el.getBoundingClientRect();
        xTo((e.clientX - (rect.left + rect.width / 2)) * 0.25);
        yTo((e.clientY - (rect.top + rect.height / 2)) * 0.35);
      },
      { signal }
    );
    el.addEventListener(
      'pointerleave',
      () => {
        xTo(0);
        yTo(0);
      },
      { signal }
    );
    signal.addEventListener('abort', () => {
      xTo(0);
      yTo(0);
    });
  }
}

/* ---------- Card spotlight (pointer-tracked accent wash) ---------- */

function setupSpotlight(signal: AbortSignal): void {
  if (!finePointer.matches) return;
  for (const card of document.querySelectorAll<HTMLElement>('.card')) {
    card.addEventListener(
      'pointermove',
      (e) => {
        if (!motionOn()) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      },
      { signal }
    );
  }
}

/* ---------- Lifecycle ---------- */

function enableInteractive(): void {
  interactiveAbort?.abort();
  interactiveAbort = new AbortController();
  setupViewTransitionOptIn();
  heroPointerWave(interactiveAbort.signal);
  setupMagnetic(interactiveAbort.signal);
  setupSpotlight(interactiveAbort.signal);
}

function disableAll(): void {
  interactiveAbort?.abort();
  interactiveAbort = null;
  for (const fn of teardowns) fn();
  teardowns = [];
  document.getElementById('vt-opt-in')?.remove();
  html.classList.remove('motion-pending');
}

function init(): void {
  setupToggle();
  if (motionOn()) {
    setupReveals();
    void heroEntrance();
    // All initial hidden states are inline now — the pre-paint guard can go.
    html.classList.remove('motion-pending');
    enableInteractive();
  } else {
    html.classList.remove('motion-pending');
  }
}

init();
