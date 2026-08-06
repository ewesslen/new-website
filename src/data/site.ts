/**
 * Single source of truth for site content and every <<TODO>> value.
 * Fill in the empty strings below and the site picks them up everywhere.
 * Links and UI elements render only when their value is set, so nothing
 * on the page is ever a dead link.
 */

export interface Link {
  label: string;
  url: string;
}

export interface Venture {
  name: string;
  /** Used to scope the per-venture accent theme, see global.css `[data-accent=…]` */
  slug: 'trellais' | 'panodash' | 'ssd' | 'stacking-sense' | 'mwcapcon' | 'geeqoid';
  kicker: string;
  description: string;
  status?: string;
  links: Link[];
}

export interface Post {
  title: string;
  /** ISO date, rendered with <time datetime> */
  date: string;
  readMinutes: number;
  /** Empty string = placeholder; the title renders as plain text, not a dead link */
  url: string;
}

export const SITE = {
  firstName: 'Erik',
  lastName: '', // TODO: last name

  /**
   * Positioning line. Three options, pick one (or edit):
   *   1. "One person. Several bets."
   *   2. "Building several things at once — on purpose."
   *   3. "The portfolio is the point."
   */
  tagline: 'One person. Several bets.',

  title: 'Erik — One person. Several bets.',
  description:
    'Solo founder building across AI, commerce, and publishing: Trellais, Panodash, Sport Shooting Depot, two newsletters, and a podcast.',

  /** Rendered in the hero; <strong> keywords are applied in Hero.astro */
  intro: [
    'I’m a solo founder working across AI, commerce, and publishing.',
    'Trellais puts AI to work for small businesses.',
    'Panodash turns your new tab into an ambient metrics dashboard.',
    'Sport Shooting Depot outfits competitive shooters.',
    'On the side: two newsletters and a podcast.',
  ],
} as const;

export const VENTURES: Venture[] = [
  {
    name: 'Trellais',
    slug: 'trellais',
    kicker: 'AI for small businesses',
    description:
      'AI that applies itself. Instead of an owner learning ChatGPT, integrations, and what to even ask, Trellais analyzes the business, builds a growth plan, and executes it — on a button press.',
    links: [
      // TODO: Trellais URL
      // { label: 'trellais.???', url: 'https://…' },
    ],
  },
  {
    name: 'Panodash',
    slug: 'panodash',
    kicker: 'Ambient metrics',
    status: 'Pre-launch',
    description:
      'An open-source browser extension that turns your new-tab page into a personal metrics dashboard. Dashboards are destinations you have to visit; Panodash shows up where you already look dozens of times a day. Local-first.',
    links: [
      { label: 'panodash.app', url: 'https://panodash.app' },
      // TODO: GitHub repo URL
      // { label: 'GitHub', url: 'https://github.com/…' },
    ],
  },
  {
    name: 'Sport Shooting Depot',
    slug: 'ssd',
    kicker: 'E-commerce',
    description:
      'Premium gear for serious competitive air-rifle and pistol shooters. Co-owned with partners.',
    links: [{ label: 'sportshootingdepot.com', url: 'https://sportshootingdepot.com' }],
  },
];

export const MEDIA: Venture[] = [
  {
    name: 'Stacking Sense',
    slug: 'stacking-sense',
    kicker: 'Newsletter',
    description:
      'On compounding small advantages across technology, AI, and modern living. Runs on Beehiiv.',
    links: [
      // TODO: Stacking Sense URL
      // { label: 'Read', url: 'https://…' },
    ],
  },
  {
    name: 'MWCAPCON',
    slug: 'mwcapcon',
    kicker: 'Newsletter',
    description: 'For Midwest entrepreneurs and capital allocators.',
    links: [
      // TODO: MWCAPCON URL
      // { label: 'Read', url: 'https://…' },
    ],
  },
  {
    name: 'Geeqoid',
    slug: 'geeqoid',
    kicker: 'Podcast',
    description: 'Co-hosted with Jarrad.',
    links: [
      // TODO: Geeqoid URL
      // { label: 'Listen', url: 'https://…' },
    ],
  },
];

/**
 * Placeholder posts — swap for a real feed later (see README, “Wiring real feeds”).
 * Leave url empty until the real post exists; empty urls render as plain text.
 */
export const POSTS: Post[] = [
  {
    title: 'Why your dashboard should come to you',
    date: '2026-07-28',
    readMinutes: 5,
    url: '',
  },
  {
    title: 'One founder, several bets: the operating system',
    date: '2026-07-14',
    readMinutes: 8,
    url: '',
  },
  {
    title: 'AI for businesses that don’t have time for AI',
    date: '2026-06-30',
    readMinutes: 6,
    url: '',
  },
  {
    title: 'Ambient metrics: glanceable beats thorough',
    date: '2026-06-12',
    readMinutes: 4,
    url: '',
  },
];

/** “What I’m focused on right now” — nownownow.com spirit. Update freely. */
export const NOW = {
  updated: '2026-08-01',
  items: [
    'Getting Trellais in front of its first small-business customers.',
    'Preparing Panodash for public launch.',
    'Keeping two newsletters on schedule.',
  ],
};

export const SOCIALS: Link[] = [
  // TODO: fill in real profiles; empty urls are not rendered.
  { label: 'X', url: '' },
  { label: 'GitHub', url: '' },
  { label: 'LinkedIn', url: '' },
  { label: 'Email', url: '' }, // e.g. 'mailto:…'
];

export const NEWSLETTER = {
  /** Which list the footer subscribe points at. TODO: confirm Stacking Sense. */
  name: 'Stacking Sense',
  /**
   * TODO: Beehiiv embed form action URL (Settings → Subscribe forms).
   * When set, the footer renders an inline email form.
   */
  formAction: '',
  /**
   * TODO: fallback — the public subscribe page URL.
   * Used (as a plain link) when formAction is empty.
   */
  subscribeUrl: '',
};
