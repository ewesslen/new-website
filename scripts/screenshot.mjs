/**
 * Dev helper: screenshots of the built site (run `npm run build` first).
 * Usage: node scripts/screenshot.mjs <outdir>
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const outdir = process.argv[2] ?? '.';
const DIST = new URL('../dist', import.meta.url).pathname;

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

const shots = [
  { name: 'home-light-desktop', scheme: 'light', width: 1280, height: 900 },
  { name: 'home-dark-desktop', scheme: 'dark', width: 1280, height: 900 },
  { name: 'home-light-mobile', scheme: 'light', width: 320, height: 720 },
];

for (const shot of shots) {
  const context = await browser.newContext({
    colorScheme: shot.scheme,
    viewport: { width: shot.width, height: shot.height },
  });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(outdir, shot.name + '.png'), fullPage: true });
  await context.close();
  console.log('saved', shot.name + '.png');
}

await browser.close();
server.close();
