/**
 * Keyboard walkthrough of the built site in dist/ (run `npm run build` first).
 * Runs with motion enabled AND reduced. Verifies, per page and mode:
 *   1. The first Tab lands on the skip link and it is visible on screen.
 *   2. Activating the skip link moves focus to <main>.
 *   3. Tabbing reaches every interactive element, in DOM order, and exits
 *      cleanly at the end (no keyboard trap).
 *   4. Every tab stop shows a visible focus indicator (outline) and is
 *      actually visible (effective opacity ~1) — with motion on, this
 *      proves the focusin failsafe completes reveals under keyboard use.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = new URL('../dist', import.meta.url).pathname;
const PAGES = ['/', '/writing/'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(DIST, path);
    const s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) file = join(DIST, path, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`FAIL  ${msg}`);
};

for (const motion of ['no-preference', 'reduce']) {
  const context = await browser.newContext({ reducedMotion: motion });
  const page = await context.newPage();

  for (const path of PAGES) {
    console.log(`\n— ${path} (motion: ${motion}) —`);
    await page.goto(base + path, { waitUntil: 'networkidle' });

    // Expected tab stops: every interactive element, in DOM order
    const expected = await page.evaluate(() =>
      [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
        .filter((el) => el.tabIndex >= 0 && getComputedStyle(el).visibility !== 'hidden')
        .map((el) => (el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 60))
    );

    const focusInfo = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        let effectiveOpacity = 1;
        for (let node = el; node; node = node.parentElement) {
          effectiveOpacity *= parseFloat(getComputedStyle(node).opacity);
        }
        return {
          label: (el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 60),
          tag: el.tagName.toLowerCase(),
          outlineVisible: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
          onScreen: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0,
          effectiveOpacity,
        };
      });

    // 1. First Tab → skip link, visible
    await page.keyboard.press('Tab');
    const first = await focusInfo();
    if (!first || !/skip to content/i.test(first.label)) {
      fail(`first tab stop is ${JSON.stringify(first?.label)}, expected the skip link`);
    } else if (!first.onScreen) {
      fail('skip link is focused but not visible on screen');
    } else if (!first.outlineVisible) {
      fail('skip link has no visible focus outline');
    } else {
      console.log('ok    first Tab reveals the skip link, with focus outline');
    }

    // 2. Skip link moves focus to main
    await page.keyboard.press('Enter');
    const target = await page.evaluate(() => document.activeElement?.id ?? null);
    if (target !== 'main') {
      fail(`skip link moved focus to ${JSON.stringify(target)}, expected #main`);
    } else {
      console.log('ok    skip link moves focus to <main>');
    }

    // 3+4. Walk the page; collect order, outline, and visibility
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const visited = [];
    for (let i = 0; i < expected.length + 5; i++) {
      await page.keyboard.press('Tab');
      const info = await focusInfo();
      if (!info) break; // focus returned to body → end of page, no trap
      if (visited.length && info.label === visited.at(-1).label && info.tag === visited.at(-1).tag) {
        fail(`keyboard trap at "${info.label}"`);
        break;
      }
      visited.push(info);
    }

    const visitedLabels = visited.map((v) => v.label);
    const missing = expected.filter((e) => !visitedLabels.includes(e));
    if (missing.length > 0) {
      fail(`unreachable by keyboard: ${missing.join(', ')}`);
    } else {
      console.log(`ok    all ${expected.length} interactive elements reachable, no trap`);
    }

    const order = visitedLabels.filter((l) => expected.includes(l));
    if (order.join('|') !== expected.join('|')) {
      fail(`tab order differs from DOM order:\n  expected: ${expected.join(' → ')}\n  actual:   ${order.join(' → ')}`);
    } else {
      console.log('ok    tab order matches DOM order');
    }

    const noOutline = visited.filter((v) => !v.outlineVisible);
    if (noOutline.length > 0) {
      fail(`no visible focus indicator on: ${noOutline.map((v) => v.label).join(', ')}`);
    } else {
      console.log('ok    visible focus indicator on every tab stop');
    }

    const invisible = visited.filter((v) => v.effectiveOpacity < 0.95);
    if (invisible.length > 0) {
      fail(
        `focused element not fully visible (reveal failsafe broken?): ${invisible
          .map((v) => `${v.label} (opacity ${v.effectiveOpacity.toFixed(2)})`)
          .join(', ')}`
      );
    } else {
      console.log('ok    every focused element is fully visible');
    }
  }
  await context.close();
}

await browser.close();
server.close();

console.log('');
if (failed) {
  console.error('Keyboard walkthrough FAILED');
  process.exit(1);
}
console.log('Keyboard walkthrough passed.');
