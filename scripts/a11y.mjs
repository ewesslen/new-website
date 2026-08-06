/**
 * Axe accessibility smoke test against the built site in dist/.
 * Run `npm run build` first. Serves dist/ on a local port and runs
 * @axe-core/playwright against each page in every combination of
 * color scheme × motion preference. With reduced motion it also asserts
 * that every reveal target is fully visible — nothing hidden, nothing
 * waiting on an animation. Fails on any violation.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const DIST = new URL('../dist', import.meta.url).pathname;
const PAGES = ['/', '/writing/', '/404.html'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
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
  // Remote env: pre-installed Chromium lives here when versions mismatch
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}

const REVEAL_TARGETS =
  '.hero > *, .section-head > *, .card, .media-item, .post-item, .now-list > li';

let failures = 0;

for (const scheme of ['light', 'dark']) {
  for (const motion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ colorScheme: scheme, reducedMotion: motion });
    const page = await context.newPage();
    for (const path of PAGES) {
      const tag = `${path} (${scheme}, motion: ${motion})`;
      await page.goto(base + path, { waitUntil: 'networkidle' });

      if (motion === 'reduce') {
        // Reduced motion must mean: everything simply present, immediately
        const hidden = await page.evaluate((sel) => {
          return [...document.querySelectorAll(sel)]
            .filter((el) => parseFloat(getComputedStyle(el).opacity) < 1)
            .map((el) => el.className || el.tagName);
        }, REVEAL_TARGETS);
        if (hidden.length > 0) {
          failures++;
          console.error(`FAIL  ${tag}: content not fully visible under reduced motion: ${hidden.join(', ')}`);
        }
      } else {
        // Let scroll-triggered reveals run before scanning
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(900);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
      }

      const results = await new AxeBuilder({ page }).analyze();
      if (results.violations.length === 0) {
        console.log(`ok    ${tag}`);
      } else {
        failures += results.violations.length;
        for (const v of results.violations) {
          console.error(`FAIL  ${tag}: [${v.impact}] ${v.id} — ${v.help}`);
          for (const node of v.nodes.slice(0, 5)) {
            console.error(`        ${node.target.join(' ')}`);
          }
        }
      }
    }
    await context.close();
  }
}

await browser.close();
server.close();

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('\nNo axe violations; reduced-motion content fully present.');
