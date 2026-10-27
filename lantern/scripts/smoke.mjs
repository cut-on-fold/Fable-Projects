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
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
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

// The pretend camera's picture: a plain light-grey frame in a small video file. The page asks any camera for
// 4K, and Chromium's own synthetic picture at that size is slow enough under software rendering to miss
// clicks on the test runner; a file of its own keeps the picture small and the camera quick.
const FAKE_CAMERA = join(SHOTS, 'fake-camera.y4m');
writeFileSync(FAKE_CAMERA, fakeCameraFile(640, 360));
function fakeCameraFile(w, h) {
  const header = Buffer.from(`YUV4MPEG2 W${w} H${h} F30:1 Ip A1:1 C420jpeg\n`, 'latin1');
  const luma = Buffer.alloc(w * h, 200);
  const chroma = Buffer.alloc((w / 2) * (h / 2), 128);
  const frame = Buffer.concat([Buffer.from('FRAME\n', 'latin1'), luma, chroma, chroma]);
  return Buffer.concat([header, frame, frame]);
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${FAKE_CAMERA}`, '--use-fake-ui-for-media-stream'],
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: dark ? 'dark' : 'light', permissions: ['camera'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: console ${m.text()}`); });
  await page.goto(URL);
  await page.waitForTimeout(400);

  // Calibrate: starts with the corners; add columns; drag a corner and nudge it.
  if ((await page.getAttribute('#tab-calibrate', 'aria-pressed')) !== 'true') errors.push(`${name}: not calibrating at first`);
  await page.click('#add-points'); // every 15 cm on a 90 × 60 cm table: 7 × 5 points
  await page.waitForTimeout(50);
  if (await page.isVisible('#add-points')) errors.push(`${name}: Add points did not turn into Corners only`);
  if ((await page.textContent('#points')) !== '7 × 5 points') errors.push(`${name}: ${await page.textContent('#points')}`);
  await page.fill('#spacing', '30');
  await page.press('#spacing', 'Enter');
  await page.waitForTimeout(50);
  if ((await page.textContent('#points')) !== '4 × 3 points') errors.push(`${name}: after 30 cm, ${await page.textContent('#points')}`);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.v1')));
  await page.waitForTimeout(250);
  let s = await stored();
  const tl = s.calibrations[0].mesh.points[0];
  await page.evaluate(() => document.activeElement?.blur()); // out of the spacing box, so keys reach the page
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
  if (s.calibrations[0].mesh.points.length !== 12 || s.calibrations[0].mesh.xs.join() !== '0,30,60,90') errors.push(`${name}: stored mesh ${JSON.stringify(s.calibrations[0].mesh.xs)} ${s.calibrations[0].mesh.points.length} points`);
  // Shift while dragging a corner moves it alone: the inner point next to it stays put; a plain drag takes it along
  {
    const inner = s.calibrations[0].mesh.points[5]; // (1, 1)
    await page.keyboard.press('h');
    await page.keyboard.down('Shift');
    await page.mouse.move(moved.x, moved.y);
    await page.mouse.down();
    await page.mouse.move(moved.x - 20, moved.y - 10, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.keyboard.press('h');
    await page.waitForTimeout(250);
    s = await stored();
    const after = s.calibrations[0].mesh.points;
    if (Math.round(after[0].x - moved.x) !== -20 || Math.round(after[0].y - moved.y) !== -10) errors.push(`${name}: shift-drag of the corner gave ${JSON.stringify(after[0])}`);
    if (Math.abs(after[5].x - inner.x) > 0.01 || Math.abs(after[5].y - inner.y) > 0.01) errors.push(`${name}: shift-drag of the corner moved the inner point ${JSON.stringify(inner)} → ${JSON.stringify(after[5])}`);
    if ((await page.getAttribute('#corner-alone', 'aria-pressed')) !== 'false') errors.push(`${name}: Corner alone should start off`);
  }
  // the inner point sits where the corners' homography puts it: on the (bent) top edge between the corners
  await page.screenshot({ path: join(SHOTS, `${name}-calibrate.png`) });

  // Tab walks the points along the row and wraps; Shift+Tab goes down the column: from the corner, two right and one down, then a nudge.
  const beforeTab = s.calibrations[0].mesh.points;
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  s = await stored();
  const afterTab = s.calibrations[0].mesh.points;
  const movedIdx = afterTab.map((p, k) => (Math.abs(p.x - beforeTab[k].x) > 1e-6 || Math.abs(p.y - beforeTab[k].y) > 1e-6 ? k : -1)).filter((k) => k >= 0);
  if (movedIdx.join() !== String(1 * 4 + 2) || Math.round(afterTab[6].x - beforeTab[6].x) !== 1) errors.push(`${name}: Tab then nudge moved points ${movedIdx} (column 2, row 1 is 6)`);

  // The camera window: a (fake) webcam picture, zoom, the four corners clicked, all remembered.
  await page.click('#camera');
  await page.waitForTimeout(800);
  const camShown = await page.evaluate(() => {
    const c = document.getElementById('cam-canvas');
    if (!c) return 'no canvas';
    const ctx = c.getContext('2d');
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 60) lit++;
    return lit > (c.width * c.height) / 20 ? 'ok' : `dark (${lit} lit px)`;
  });
  if (camShown !== 'ok') errors.push(`${name}: camera picture ${camShown}: ${await page.textContent('#cam-status')}`);
  await page.click('#cam-zoom-2');
  if ((await page.getAttribute('#cam-zoom-2', 'aria-pressed')) !== 'true') errors.push(`${name}: camera zoom`);
  // Snapshot saves the whole camera picture
  const [snap] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), page.click('#cam-snap')]);
  if (!snap || snap.suggestedFilename() !== 'lantern-camera.png') errors.push(`${name}: snapshot gave ${snap?.suggestedFilename()}`);
  await page.click('#cam-corners');
  const box = await page.locator('#cam-canvas').boundingBox();
  // the ring drawn in place of the pointer: yellow pixels around where the mouse is
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForTimeout(150);
  const ring = await page.evaluate(() => {
    const c = document.getElementById('cam-canvas');
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const px = ctx.getImageData(Math.round(c.width / 2 - 14 * dpr), Math.round(c.height / 2 - 14 * dpr), Math.round(28 * dpr), Math.round(28 * dpr)).data;
    let yellow = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] > 200 && px[i + 1] > 170 && px[i + 2] < 140) yellow++;
    return yellow;
  });
  if (ring < 20) errors.push(`${name}: no ring at the pointer (${ring} yellow px)`);
  if ((await page.$eval('#cam-canvas', (c) => getComputedStyle(c).cursor)) !== 'none') errors.push(`${name}: pointer not hidden over the picture`);
  for (const [fx, fy] of [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); // rough: the window zooms in there
    if (!/close up/.test(await page.textContent('#cam-status'))) errors.push(`${name}: corner setup did not ask for the close click`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // close: the centre of the zoomed view is the rough spot
  }
  await page.waitForTimeout(250);
  s = await stored();
  if (!s.calibrations[0].camera || s.calibrations[0].camera.corners?.length !== 4 || s.calibrations[0].camera.zoom !== 2) errors.push(`${name}: camera setup stored ${JSON.stringify(s.calibrations[0].camera)}`);
  if (!/Following/.test(await page.textContent('#cam-status'))) errors.push(`${name}: camera status ${await page.textContent('#cam-status')}`);
  await page.screenshot({ path: join(SHOTS, `${name}-camera.png`) });
  // Auto against the fake camera: there are no dots to find, so every point is left as it was and the
  // summary says so; the tools come back afterwards. With the small pretend picture this takes well under a
  // minute; the wait is generous for a slow runner.
  s = await stored();
  const beforeAuto = JSON.stringify(s.calibrations[0].mesh.points);
  await page.click('#auto');
  await page.waitForTimeout(300);
  if (!(await page.isHidden('#bar'))) errors.push(`${name}: tools not hidden while Auto runs`);
  if (!(await page.isHidden('#peek'))) errors.push(`${name}: Show tools button not hidden while Auto runs`);
  await page.waitForFunction(() => /points set from the camera|Nothing was set/.test(document.getElementById('hint')?.textContent ?? ''), null, { timeout: 360000 }).catch(() => errors.push(`${name}: Auto did not finish`));
  const summary = await page.textContent('#hint');
  if (!/0 of 12 points set/.test(summary)) errors.push(`${name}: Auto summary: ${summary}`);
  s = await stored();
  if (JSON.stringify(s.calibrations[0].mesh.points) !== beforeAuto) errors.push(`${name}: Auto moved points with no dots to see`);
  if (await page.isHidden('#bar')) errors.push(`${name}: tools not back after Auto`);
  // What the camera saw is kept and saved as a picture.
  const [frames] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), page.click('#frames')]);
  if (!frames || frames.suggestedFilename() !== 'lantern-camera-frames.png') errors.push(`${name}: camera frames gave ${frames?.suggestedFilename()}`);
  await page.click('#cam-close');
  if (await page.$('#cam')) errors.push(`${name}: camera window did not close`);

  // Reload: the calibration is still there.
  await page.reload();
  await page.waitForTimeout(400);
  if ((await page.textContent('#points')) !== '4 × 3 points') errors.push(`${name}: points lost on reload`);

  // Inches: a 35 × 24 in mat with points every 6 in gets a short last column, and whole-inch labels.
  await page.click('#unit-in');
  await page.waitForTimeout(50);
  if ((await page.inputValue('#spacing')) !== '11 13/16') errors.push(`${name}: inch spacing ${await page.inputValue('#spacing')}`);
  await page.fill('#table-width', '35');
  await page.press('#table-width', 'Enter');
  await page.fill('#table-height', '24');
  await page.press('#table-height', 'Enter');
  await page.fill('#spacing', '6');
  await page.press('#spacing', 'Enter');
  await page.waitForTimeout(250);
  s = await stored();
  const inches = s.calibrations[0].mesh.xs.map((x) => Math.round((x / 2.54) * 100) / 100).join();
  if (inches !== '0,6,12,18,24,30,35') errors.push(`${name}: inch columns ${inches}`);
  if ((await page.textContent('#points')) !== '7 × 5 points') errors.push(`${name}: inch points ${await page.textContent('#points')}`);
  await page.screenshot({ path: join(SHOTS, `${name}-inches.png`) });
  await page.click('#unit-cm');
  await page.fill('#table-width', '90');
  await page.press('#table-width', 'Enter');
  await page.fill('#table-height', '60');
  await page.press('#table-height', 'Enter');
  await page.fill('#spacing', '30');
  await page.press('#spacing', 'Enter');
  await page.waitForTimeout(100);

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

  // The card for this table, drawn in the page: the right size, opened as the pattern.
  await page.click('#tab-calibrate');
  await page.click('#project-card');
  await page.waitForFunction(() => document.getElementById('open')?.textContent === 'calibration-card-90x60cm.svg', null, { timeout: 10000 }).catch(() => errors.push(`${name}: the table's card did not open`));
  await page.waitForTimeout(400);
  px = await inkPixels(page, false);
  if (px.coloured < 2000) errors.push(`${name}: table card not drawn (${px.coloured} coloured px of ${px.drawn})`);
  await page.screenshot({ path: join(SHOTS, `${name}-card.png`) });
  // Saving it downloads an SVG of the same name.
  await page.click('#tab-calibrate');
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#save-card')]);
  if (!download || download.suggestedFilename() !== 'calibration-card-90x60cm.svg') errors.push(`${name}: save card gave ${download?.suggestedFilename()}`);
  await page.click('#tab-project');

  // An SVG calibration card from the repository: six layers, one switched off.
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
