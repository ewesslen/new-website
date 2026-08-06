/**
 * Renders scripts/og.html → public/og.png (1200×630).
 * Re-run after changing the name or tagline in og.html — keep it in sync
 * with SITE in src/data/site.ts.
 */

import { chromium } from 'playwright';

const src = new URL('./og.html', import.meta.url).href;
const out = new URL('../public/og.png', import.meta.url).pathname;

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}

const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(src);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
