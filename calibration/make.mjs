#!/usr/bin/env node
// Writes the calibration cards as SVG files, in millimetres, for projecting
// with Pattern Projector or printing at 100%. No dependencies: `node make.mjs`.
//
// Each card has, like a Grain-Nest export: a 4 in calibration square in
// aubergine with its label, 2 mm lines, and a cyan border just inside the page
// edge (cyan stays visible when the projector app inverts the colours).
// Around that: a 1 cm grid, inch rulers along the top and left, a 5 cm square
// in each corner, corner-to-corner diagonals and a 30 cm circle, so a wrong
// scale, a keystone error or a skew shows up as a number you can measure.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = 25.4;

const CUT = '#3b1f6e'; // Grain-Nest cutting line, aubergine
const SEW = '#4f8a26'; // Grain-Nest sew and grain lines, moss green
const BORDER = '#00ffff';
const GRID = '#9a9a9a';
const LINE = 2; // mm, Grain-Nest's default line width

const r = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Word-wrap to at most `chars` characters a line. */
export function wrap(text, chars) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > chars) {
      lines.push(line);
      line = word;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function card({ width, height, name, purpose }) {
  const parts = [];
  const layer = (label, body) =>
    parts.push(`<g inkscape:groupmode="layer" inkscape:label="${esc(label)}" id="${esc(label.toLowerCase().replace(/\W+/g, '-'))}">\n${body}\n</g>`);

  // ---- grid: 1 cm lines, heavier every 5 and 10 cm, numbered along the bottom and right in cm
  {
    const lines = [];
    for (let x = 10; x < width; x += 10) {
      const w = x % 100 === 0 ? 0.8 : x % 50 === 0 ? 0.5 : 0.25;
      lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${GRID}" stroke-width="${w}"/>`);
      if (x % 50 === 0) lines.push(`<text x="${x + 1.5}" y="${r(height - 2)}" font-size="4" fill="${GRID}">${x / 10}</text>`);
    }
    for (let y = 10; y < height; y += 10) {
      const w = y % 100 === 0 ? 0.8 : y % 50 === 0 ? 0.5 : 0.25;
      lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${GRID}" stroke-width="${w}"/>`);
      if (y % 50 === 0) lines.push(`<text x="${r(width - 6)}" y="${y - 1.5}" font-size="4" fill="${GRID}">${y / 10}</text>`);
    }
    layer('Grid cm', lines.join('\n'));
  }

  // ---- inch rulers along the top and the left edges
  {
    const ticks = [];
    for (let i = 0; i * IN / 4 <= width; i++) {
      const x = r((i * IN) / 4);
      const len = i % 4 === 0 ? 8 : i % 2 === 0 ? 5 : 3;
      ticks.push(`<line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="${CUT}" stroke-width="${i % 4 === 0 ? 0.6 : 0.3}"/>`);
      if (i % 4 === 0 && i > 0) ticks.push(`<text x="${r(x + 1)}" y="11" font-size="4" fill="${CUT}">${i / 4}″</text>`);
    }
    for (let i = 0; i * IN / 4 <= height; i++) {
      const y = r((i * IN) / 4);
      const len = i % 4 === 0 ? 8 : i % 2 === 0 ? 5 : 3;
      ticks.push(`<line x1="0" y1="${y}" x2="${len}" y2="${y}" stroke="${CUT}" stroke-width="${i % 4 === 0 ? 0.6 : 0.3}"/>`);
      if (i % 4 === 0 && i > 0) ticks.push(`<text x="9" y="${r(y - 1)}" font-size="4" fill="${CUT}">${i / 4}″</text>`);
    }
    layer('Rulers in', ticks.join('\n'));
  }

  // ---- keystone and skew: diagonals, and a circle on the big cards
  const big = Math.min(width, height) >= 260;
  {
    const cx = width / 2;
    const cy = height / 2;
    const d = Math.min(300, width - 40, height - 40);
    const items = [
      `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${SEW}" stroke-width="0.5" stroke-dasharray="6 4"/>`,
      `<line x1="${width}" y1="0" x2="0" y2="${height}" stroke="${SEW}" stroke-width="0.5" stroke-dasharray="6 4"/>`,
    ];
    if (big) {
      items.push(`<circle cx="${cx}" cy="${cy}" r="${r(d / 2)}" fill="none" stroke="${SEW}" stroke-width="${LINE}"/>`);
      items.push(`<text x="${cx}" y="${r(cy + d / 2 + 8)}" text-anchor="middle" font-size="5" fill="${SEW}">${d / 10} cm circle: should look round</text>`);
    }
    layer('Keystone', items.join('\n'));
  }

  // ---- the squares to measure: 4 in at the centre inside 20 cm, 5 cm in each corner
  {
    const cx = width / 2;
    const cy = height / 2;
    const s4 = 4 * IN;
    const sq = [];
    sq.push(`<rect id="calibration-square" inkscape:label="calibration-square" x="${r(cx - s4 / 2)}" y="${r(cy - s4 / 2)}" width="${r(s4)}" height="${r(s4)}" fill="none" stroke="${CUT}" stroke-width="${LINE}"/>`);
    sq.push(`<text id="calibration-label" x="${r(cx - s4 / 2)}" y="${r(cy - s4 / 2 - 4)}" font-size="6" fill="${CUT}">4 in (101.6 mm) square: measure to check the scale</text>`);
    if (big) {
      sq.push(`<rect x="${r(cx - 100)}" y="${r(cy - 100)}" width="200" height="200" fill="none" stroke="${CUT}" stroke-width="${LINE}" stroke-dasharray="10 5"/>`);
      sq.push(`<text x="${r(cx - 100)}" y="${r(cy + 100 + 8)}" font-size="6" fill="${CUT}">20 cm square</text>`);
    }
    const m = 15;
    const c = 50;
    for (const [x, y] of [[m, m], [width - m - c, m], [m, height - m - c], [width - m - c, height - m - c]]) {
      sq.push(`<rect x="${r(x)}" y="${r(y)}" width="${c}" height="${c}" fill="none" stroke="${CUT}" stroke-width="${LINE}"/>`);
      sq.push(`<text x="${r(x + 3)}" y="${r(y + 8)}" font-size="5" fill="${CUT}">5 cm</text>`);
    }
    layer('Calibration', sq.join('\n'));
  }

  // ---- instructions, wrapped into the band that is free of squares
  {
    const m = 15;
    const c = 50;
    const paragraphs = [
      [`${name}: ${purpose}`, true],
      [big
        ? 'Calibrate the projector, then measure the 4 in square at the centre and the 5 cm square in each corner. Centre right but corners differ: keystone. One side long: skew. Circle not round: both. Everything the same but wrong: scale.'
        : 'Measure the 4 in square and the 5 cm corner squares. All wrong by the same amount: the printer is scaling. Corners differ: the paper slipped.', false],
      [big ? 'Lines are 2 mm wide, like a Grain-Nest export. Measure to the middle of the line.' : 'Lines 2 mm wide, like a Grain-Nest export; measure to the middle.', false],
    ];
    // big cards: between the bottom corner squares; small ones: under the centre square, full width
    const x0 = big ? m + c + 10 : m;
    const x1 = big ? width - m - c - 10 : width - m;
    const y0 = big ? height - m - c + 2 : height / 2 + 2 * IN + 5;
    const size = big ? 5 : 3.4;
    const lineHeight = size * 1.45;
    const text = [];
    let y = y0 + size;
    for (const [para, bold] of paragraphs) {
      for (const line of wrap(para, Math.floor((x1 - x0) / (size * 0.52)))) {
        text.push(`<text x="${x0}" y="${r(y)}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${CUT}">${esc(line)}</text>`);
        y += lineHeight;
      }
      y += lineHeight * 0.3;
    }
    layer('Instructions', text.join('\n'));
  }

  // ---- border, drawn just inside the page like Grain-Nest's sheet border
  layer('Border', `<rect x="${LINE / 2}" y="${LINE / 2}" width="${r(width - LINE)}" height="${r(height - LINE)}" fill="none" stroke="${BORDER}" stroke-width="${LINE}"/>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
<title>${esc(name)}</title>
<rect width="${width}" height="${height}" fill="#ffffff"/>
${parts.join('\n')}
</svg>
`;
}

export const CARDS = [
  { file: 'projector-90x60cm.svg', width: 900, height: 600, name: 'Projector card 90 × 60 cm', purpose: 'the whole throw of a ceiling projector' },
  { file: 'projector-60x40cm.svg', width: 600, height: 400, name: 'Projector card 60 × 40 cm', purpose: 'a smaller throw, or the middle of the table' },
  { file: 'print-a4.svg', width: 210, height: 297, name: 'Print card A4', purpose: 'print at 100% (no fit to page) to check a printer' },
  { file: 'print-letter.svg', width: r(8.5 * IN), height: r(11 * IN), name: 'Print card Letter', purpose: 'print at 100% (no fit to page) to check a printer' },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(HERE, 'cards');
  mkdirSync(out, { recursive: true });
  for (const c of CARDS) {
    writeFileSync(join(out, c.file), card(c));
    console.log(`${c.file}  ${c.width} × ${c.height} mm`);
  }
}
