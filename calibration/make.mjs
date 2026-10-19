#!/usr/bin/env node
// Writes the calibration cards in cards/ as SVG files, in millimetres, for
// projecting with Lantern or Pattern Projector or printing at 100%. The
// drawing is in card.mjs (Lantern draws a card for any table size from it);
// the sizes are below. No dependencies: `node make.mjs`.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IN, card, r } from './card.mjs';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(HERE, 'cards');
  mkdirSync(out, { recursive: true });
  for (const c of CARDS) {
    writeFileSync(join(out, c.file), card(c));
    console.log(`${c.file}  ${c.width} × ${c.height} mm${c.unit === 'in' ? ' (inch grid)' : ''}`);
  }
}
