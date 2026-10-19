#!/usr/bin/env node
// Draws public/icon-192.png and icon-512.png from public/icon.svg in a
// headless browser (the same Chromium the smoke test uses):
// `node scripts/icons.mjs`. Only needed when the icon changes.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = join(HERE, '..', 'public');
const svg = readFileSync(join(PUB, 'icon.svg'), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(join(PUB, `icon-${size}.png`), png);
  console.log(`icon-${size}.png`);
  await page.close();
}
await browser.close();
