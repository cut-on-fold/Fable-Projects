#!/usr/bin/env node
// Clicks through the built page in a headless browser at desk and phone
// widths, light and dark: every calculator renders, nothing overflows, no
// script errors; typing, the unit toggle, Copy, People and the offline copy
// all work. Build first: `npm run build && npm run smoke`.
// Needs Chromium: `npx playwright install chromium` (CI adds --with-deps).

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist');
const SHOTS = join(HERE, '..', 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html missing: run npm run build first');
  process.exit(2);
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/`;

const launch = { executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined };
const browser = await chromium.launch(launch);
const errors = [];
const SAMPLE_CSV = 'Name,Status,High bust,Full bust / chest,Waist,Hips,Wrist circumference\nAv,Current,36 in,40.5 in,34 in,44 in,6.25 in\nMum,Current,38 in,42 in,37 in,44 in,6.5 in\n';

async function run(name, { width, dark }) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: dark ? 'dark' : 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(URL);
  await page.waitForTimeout(300);
  const phone = width <= 760;
  const go = (id) => (phone ? page.selectOption('#nav-select', id) : page.click(`#nav-${id}`));
  const tools = await page.$$eval('.nav-list button', (bs) => bs.map((b) => b.id.replace('nav-', '')));
  if (tools.length < 20) errors.push(`${name}: only ${tools.length} tools`);
  for (const id of tools) {
    await go(id);
    await page.waitForTimeout(30);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > width) errors.push(`${name}: ${id} overflows (${sw} > ${width})`);
    const text = await page.$eval('.tool', (t) => t.innerText);
    if (!text.toLowerCase().includes('results') && id !== 'people') errors.push(`${name}: ${id} has no results`);
    if (['buttons', 'people', 'weigh'].includes(id)) await page.screenshot({ path: join(SHOTS, `${name}-${id}.png`), fullPage: true });
  }

  // fractions, suffixes, unit toggle
  await go('circle');
  await page.fill('#circle-waist', '30 in');
  await page.waitForTimeout(30);
  const cm = await page.$eval('.headline .value', (e) => e.textContent);
  await page.click('#unit-in');
  await page.waitForTimeout(30);
  const inch = await page.$eval('.headline .value', (e) => e.textContent);
  if (cm !== '11.4 cm' || inch !== '4 1/2 in') errors.push(`${name}: circle gave ${cm} / ${inch}`);
  await page.fill('#circle-waist', 'abc');
  if ((await page.getAttribute('#circle-waist', 'aria-invalid')) !== 'true') errors.push(`${name}: bad input not flagged`);
  await page.click('#unit-cm');

  // copy
  await go('thread');
  await page.click('#copy-thread');
  await page.waitForTimeout(100);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  if (!clip.includes('Thread (Thimble)') || !clip.includes('Bobbin')) errors.push(`${name}: copy text wrong`);

  // people: import, then fill a calculator from a name
  await go('people');
  await page.setInputFiles('#people-file', { name: 'Measurements.csv', mimeType: 'text/csv', buffer: Buffer.from(SAMPLE_CSV) });
  await page.waitForTimeout(100);
  const names = await page.$$eval('.people tbody td:first-child', (tds) => tds.map((t) => t.textContent));
  if (names.join(',') !== 'Av,Mum') errors.push(`${name}: people ${names}`);
  await go('bust');
  await page.selectOption('#bust-person', 'Mum');
  await page.waitForTimeout(30);
  const high = await page.inputValue('#bust-high');
  const cup = await page.$eval('.headline .value', (e) => e.textContent);
  if (high !== '96.52' || cup !== 'D') errors.push(`${name}: fill from Mum gave ${high} / ${cup}`);
  await page.evaluate(() => localStorage.clear());

  // offline, once
  if (name === 'desk-light') {
    await page.reload();
    await page.waitForTimeout(800);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch((e) => errors.push(`offline reload: ${e.message}`));
    await page.waitForTimeout(300);
    const title = await page.$eval('h1', (h) => h.textContent).catch(() => null);
    if (title !== 'Thimble') errors.push('offline page did not load');
    await ctx.setOffline(false);
  }
  await ctx.close();
}

await run('desk-light', { width: 1200, dark: false });
await run('desk-dark', { width: 1200, dark: true });
await run('phone-light', { width: 390, dark: false });
await run('phone-dark', { width: 390, dark: true });
await browser.close();
server.close();
if (errors.length) {
  console.error(`Smoke test failed:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('Smoke test passed: 4 runs, screenshots in smoke-shots/');
