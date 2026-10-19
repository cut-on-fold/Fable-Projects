#!/usr/bin/env node
// Clicks through the built page in a headless browser, light and dark:
// calibrating (adding points, dragging and nudging one, the calibration
// surviving a reload), then projecting a small PDF and a calibration card
// SVG through WebGL, turning, inverting and showing the layers; no script
// errors anywhere, and the offline copy. Build first:
// `npm run build && npm run smoke`.
// Needs Chromium: `npx playwright install chromium` (CI adds --with-deps),
// or point PLAYWRIGHT_CHROMIUM at one.

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

/** A one-page A4 PDF with a thick black square and a diagonal, written by hand so no pattern file is needed. */
export function makePdf() {
  const content = '8 w 0 0 0 RG 100 100 200 200 re S 100 700 m 495 400 l S BT /F1 36 Tf 120 600 Td (Lantern) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const PDF = makePdf();
const CARD = readFileSync(join(HERE, '..', '..', 'calibration', 'cards', 'projector-60x40cm.svg'));

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];

/** How many of the drawn pixels are dark (or, inverted, light): is anything on the WebGL canvas? */
async function inkPixels(page, inverted) {
  return page.evaluate((inverted) => {
    const c = document.getElementById('gl');
    const gl = c.getContext('webgl2');
    const px = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let ink = 0;
    let drawn = 0;
    let coloured = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      drawn++;
      const dark = px[i] < 80 && px[i + 1] < 80 && px[i + 2] < 80;
      const light = px[i] > 200 && px[i + 1] > 200 && px[i + 2] > 200;
      if (inverted ? light : dark) ink++;
      if (!light) coloured++;
    }
    return { ink, drawn, coloured };
  }, inverted);
}

async function run(name, { dark }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: console ${m.text()}`); });
  await page.goto(URL);
  await page.waitForTimeout(400);

  // Calibrate: starts with the corners; add columns; drag a corner and nudge it.
  if ((await page.getAttribute('#tab-calibrate', 'aria-pressed')) !== 'true') errors.push(`${name}: not calibrating at first`);
  await page.click('#add-points'); // 3 × 2 on a 90 × 60 cm table
  if (await page.isVisible('#add-points')) errors.push(`${name}: Add points did not turn into Corners only`);
  if ((await page.textContent('#cols')) !== '3' || (await page.textContent('#rows')) !== '2') errors.push(`${name}: columns/rows ${await page.textContent('#cols')}/${await page.textContent('#rows')}`);
  if (!/every 30 cm/.test(await page.textContent('#cols-every'))) errors.push(`${name}: spacing ${await page.textContent('#cols-every')}`);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.v1')));
  await page.waitForTimeout(250);
  let s = await stored();
  const tl = s.calibrations[0].mesh.points[0];
  await page.keyboard.press('h'); // the corner may sit under the toolbar
  await page.mouse.move(tl.x, tl.y);
  await page.mouse.down();
  await page.mouse.move(tl.x + 15, tl.y + 25, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.up('Shift');
  await page.keyboard.press('h');
  await page.waitForTimeout(250);
  s = await stored();
  const moved = s.calibrations[0].mesh.points[0];
  if (Math.round(moved.x - tl.x) !== 16 || Math.round(moved.y - tl.y) !== 35) errors.push(`${name}: corner drag gave ${JSON.stringify(moved)} from ${JSON.stringify(tl)}`);
  if (s.calibrations[0].mesh.points.length !== 12) errors.push(`${name}: ${s.calibrations[0].mesh.points.length} points`);
  // the inner point sits where the corners' homography puts it: on the (bent) top edge between the corners
  await page.screenshot({ path: join(SHOTS, `${name}-calibrate.png`) });

  // Reload: the calibration is still there.
  await page.reload();
  await page.waitForTimeout(400);
  if ((await page.textContent('#cols')) !== '3') errors.push(`${name}: columns lost on reload`);

  // Inches relabel the spacing and the size boxes.
  await page.click('#unit-in');
  await page.waitForTimeout(50);
  if (!/every 11 3\/4 in/.test(await page.textContent('#cols-every'))) errors.push(`${name}: inch spacing ${await page.textContent('#cols-every')}`);
  await page.click('#unit-cm');

  // Project: the welcome card, then a PDF drawn through WebGL.
  await page.click('#tab-project');
  await page.waitForTimeout(50);
  if (await page.isHidden('#welcome')) errors.push(`${name}: no welcome card`);
  await page.setInputFiles('#file', { name: 'square.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.waitForFunction(() => document.getElementById('open')?.textContent === 'square.pdf', null, { timeout: 15000 }).catch(() => errors.push(`${name}: pdf did not open`));
  await page.waitForTimeout(600);
  if (!(await page.isHidden('#welcome'))) errors.push(`${name}: welcome card still up`);
  let px = await inkPixels(page, false);
  if (px.drawn < 10000) errors.push(`${name}: page not drawn (${px.drawn} px)`);
  if (px.ink < 500) errors.push(`${name}: no lines on the page (${px.ink} dark px)`);
  await page.screenshot({ path: join(SHOTS, `${name}-project.png`) });

  // Invert, turn, flip, nudge, weight: all without errors, and the state follows.
  await page.keyboard.press('i');
  await page.waitForTimeout(100);
  px = await inkPixels(page, true);
  if (px.ink < 500) errors.push(`${name}: inverted page has no light lines (${px.ink})`);
  await page.keyboard.press('i');
  await page.keyboard.press('r');
  await page.waitForTimeout(50);
  if ((await page.inputValue('#degrees')) !== '90') errors.push(`${name}: R gave ${await page.inputValue('#degrees')}°`);
  await page.keyboard.press('f');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('+');
  await page.waitForTimeout(250);
  s = await stored();
  if (!s.placement) errors.push(`${name}: no placement stored`);
  else if (!s.placement.flipX || s.placement.rotation !== 270 || s.weight !== 1) errors.push(`${name}: placement ${JSON.stringify(s.placement)} weight ${s.weight}`);
  // Dragging moves it in table centimetres.
  const before = s.placement?.x ?? 0;
  await page.mouse.move(640, 500);
  await page.mouse.down();
  await page.mouse.move(740, 500, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  s = await stored();
  if (!(s.placement && s.placement.x > before + 5)) errors.push(`${name}: drag moved x from ${before} to ${s.placement?.x}`);
  await page.keyboard.press('0');
  await page.keyboard.press('g');
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(SHOTS, `${name}-grid.png`) });

  // An SVG calibration card: six layers, one switched off.
  await page.setInputFiles('#file', { name: 'projector-60x40cm.svg', mimeType: 'image/svg+xml', buffer: CARD });
  await page.waitForFunction(() => /Layers \(6\/6\)/.test(document.getElementById('layers')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => errors.push(`${name}: svg layers not listed`));
  await page.waitForTimeout(400);
  px = await inkPixels(page, false);
  if (px.coloured < 2000) errors.push(`${name}: card not drawn (${px.coloured} coloured px of ${px.drawn})`);
  await page.click('#layers');
  await page.waitForTimeout(50);
  await page.locator('#pop-layers input').first().uncheck();
  await page.waitForTimeout(300);
  if (!/Layers \(5\/6\)/.test(await page.textContent('#layers'))) errors.push(`${name}: layer toggle ${await page.textContent('#layers')}`);
  await page.keyboard.press('Escape');

  // Hide the tools and bring them back.
  await page.keyboard.press('h');
  if (!(await page.isHidden('#bar')) || (await page.isHidden('#peek'))) errors.push(`${name}: hide tools`);
  await page.keyboard.press('Escape');
  if (await page.isHidden('#bar')) errors.push(`${name}: show tools`);

  await page.evaluate(() => localStorage.clear());

  // offline, once
  if (name === 'light') {
    await page.reload();
    await page.waitForTimeout(800);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch((e) => errors.push(`offline reload: ${e.message}`));
    await page.waitForTimeout(300);
    const title = await page.$eval('h1', (h) => h.textContent).catch(() => null);
    if (title !== 'Lantern') errors.push('offline page did not load');
    await ctx.setOffline(false);
  }
  await ctx.close();
}

await run('light', { dark: false });
await run('dark', { dark: true });
await browser.close();
server.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('smoke: ok');
