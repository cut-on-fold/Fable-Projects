#!/usr/bin/env node
// Writes the calibration cards in cards/ as SVG files, in millimetres, for
// projecting with Lantern or Pattern Projector or printing at 100%. The
// drawing is in card.mjs (Lantern draws a card for any table size from it);
// the sizes are below. No dependencies: `node make.mjs`.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IN, card, layout, r, tile } from './card.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const CARDS = [
  { file: 'projector-90x60cm.svg', width: 900, height: 600, name: 'Projector card 90 × 60 cm', purpose: 'the whole throw of a ceiling projector' },
  { file: 'projector-60x40cm.svg', width: 600, height: 400, name: 'Projector card 60 × 40 cm', purpose: 'a smaller throw, or the middle of the table' },
  { file: 'projector-53x35in.svg', width: r(53 * IN), height: r(35 * IN), unit: 'in', name: 'Projector card 53 × 35 in', purpose: 'the whole throw over a cutting table ruled in inches' },
  { file: 'projector-36x24in.svg', width: r(36 * IN), height: r(24 * IN), unit: 'in', name: 'Projector card 36 × 24 in', purpose: 'a large cutting mat ruled in inches' },
  { file: 'projector-24x18in.svg', width: r(24 * IN), height: r(18 * IN), unit: 'in', name: 'Projector card 24 × 18 in', purpose: 'a medium cutting mat ruled in inches' },
  { file: 'print-a4.svg', width: 210, height: 297, name: 'Print card A4', purpose: 'print at 100% (no fit to page) to check a printer' },
  { file: 'print-letter.svg', width: r(8.5 * IN), height: r(11 * IN), name: 'Print card Letter', purpose: 'print at 100% (no fit to page) to check a printer' },
  { file: 'print-letter-in.svg', width: r(8.5 * IN), height: r(11 * IN), unit: 'in', name: 'Print card Letter, inch grid', purpose: 'print at 100% (no fit to page) to check a printer against an inch ruler' },
];

/** Layouts for drawing a mat: lines every 12 in and a target for a dot every 6 in, for Lantern's Auto. */
export const LAYOUTS = [
  { file: 'mat-53x35in-layout.svg', width: r(53 * IN), height: r(35 * IN), name: 'Mat layout 53 × 35 in', purpose: 'lines every 12 in and a dot every 6 in, for drawing a cutting table' },
  { file: 'mat-36x24in-layout.svg', width: r(36 * IN), height: r(24 * IN), name: 'Mat layout 36 × 24 in', purpose: 'lines every 12 in and a dot every 6 in, for drawing a large mat' },
];

/** A page to print: a 6 in cell with a dot target at each corner. */
export const TILES = [
  { file: 'dot-tile-letter.svg', width: r(8.5 * IN), height: r(11 * IN), name: 'Dot tile, Letter', purpose: 'a 6 in cell of dot targets to print at 100%, for marking or checking dots' },
  { file: 'dot-tile-a4.svg', width: 210, height: 297, name: 'Dot tile, A4', purpose: 'a 6 in cell of dot targets to print at 100%, for marking or checking dots' },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(HERE, 'cards');
  mkdirSync(out, { recursive: true });
  for (const c of CARDS) {
    writeFileSync(join(out, c.file), card(c));
    console.log(`${c.file}  ${c.width} × ${c.height} mm${c.unit === 'in' ? ' (inch grid)' : ''}`);
  }
  for (const c of LAYOUTS) {
    writeFileSync(join(out, c.file), layout(c));
    console.log(`${c.file}  ${c.width} × ${c.height} mm (layout)`);
  }
  for (const c of TILES) {
    writeFileSync(join(out, c.file), tile(c));
    console.log(`${c.file}  ${c.width} × ${c.height} mm (tile)`);
  }
}
