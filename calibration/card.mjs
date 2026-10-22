// Draws one calibration card as an SVG string. Plain JavaScript with no
// imports so that make.mjs can write the committed cards with Node and
// Lantern can draw one in the browser for whatever table it has.
//
// Each card has, like a Grain-Nest export: a 4 in calibration square in
// aubergine with its label, 2 mm lines, and a cyan border just inside the page
// edge (cyan stays visible when the projector app inverts the colours).
// Around that: a 1 cm grid, inch rulers along the top and left, a 5 cm square
// in each corner, corner-to-corner diagonals and a 30 cm circle, so a wrong
// scale, a keystone error or a skew shows up as a number you can measure.
// The inch cards (unit: 'in') have the grid every inch, heavier every 6 and
// 12, a 2 in square in each corner, an 8 in dashed square and a 12 in circle,
// for a mat ruled in inches.

export const IN = 25.4;

const CUT = '#3b1f6e'; // Grain-Nest cutting line, aubergine
const SEW = '#4f8a26'; // Grain-Nest sew and grain lines, moss green
const BORDER = '#00ffff';
const GRID = '#9a9a9a';
const LINE = 2; // mm, Grain-Nest's default line width

export const r = (n) => Math.round(n * 1000) / 1000;
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

export function card({ width, height, name, purpose, unit = 'cm' }) {
  const parts = [];
  const layer = (label, body) =>
    parts.push(`<g inkscape:groupmode="layer" inkscape:label="${esc(label)}" id="${esc(label.toLowerCase().replace(/\W+/g, '-'))}">\n${body}\n</g>`);
  const inches = unit === 'in';

  // ---- grid: every cm, heavier every 5 and 10, numbered every 5 along the bottom and right;
  //      or every inch, heavier every 6 and 12, numbered every 6
  {
    const step = inches ? IN : 10;
    const medium = inches ? 6 : 5;
    const heavy = inches ? 12 : 10;
    const lines = [];
    for (let i = 1; i * step < width - 1e-6; i++) {
      const x = r(i * step);
      const w = i % heavy === 0 ? 0.8 : i % medium === 0 ? 0.5 : 0.25;
      lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${GRID}" stroke-width="${w}"/>`);
      if (i % medium === 0) lines.push(`<text x="${r(x + 1.5)}" y="${r(height - 2)}" font-size="4" fill="${GRID}">${i}</text>`);
    }
    for (let i = 1; i * step < height - 1e-6; i++) {
      const y = r(i * step);
      const w = i % heavy === 0 ? 0.8 : i % medium === 0 ? 0.5 : 0.25;
      lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${GRID}" stroke-width="${w}"/>`);
      if (i % medium === 0) lines.push(`<text x="${r(width - 6)}" y="${r(y - 1.5)}" font-size="4" fill="${GRID}">${i}</text>`);
    }
    layer(inches ? 'Grid in' : 'Grid cm', lines.join('\n'));
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
    const d = Math.min(inches ? 12 * IN : 300, width - 40, height - 40);
    const items = [
      `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${SEW}" stroke-width="0.5" stroke-dasharray="6 4"/>`,
      `<line x1="${width}" y1="0" x2="0" y2="${height}" stroke="${SEW}" stroke-width="0.5" stroke-dasharray="6 4"/>`,
    ];
    if (big) {
      items.push(`<circle cx="${cx}" cy="${cy}" r="${r(d / 2)}" fill="none" stroke="${SEW}" stroke-width="${LINE}"/>`);
      items.push(`<text x="${cx}" y="${r(cy + d / 2 + 8)}" text-anchor="middle" font-size="5" fill="${SEW}">${inches ? `${r(d / IN)} in` : `${d / 10} cm`} circle: should look round</text>`);
    }
    layer('Keystone', items.join('\n'));
  }

  // ---- the squares to measure: 4 in at the centre inside 20 cm (8 in), 5 cm (2 in) in each corner
  const m = inches ? 0.5 * IN : 15;
  const c = inches ? 2 * IN : 50;
  const cornerLabel = inches ? '2 in' : '5 cm';
  {
    const cx = width / 2;
    const cy = height / 2;
    const s4 = 4 * IN;
    const sq = [];
    sq.push(`<rect id="calibration-square" inkscape:label="calibration-square" x="${r(cx - s4 / 2)}" y="${r(cy - s4 / 2)}" width="${r(s4)}" height="${r(s4)}" fill="none" stroke="${CUT}" stroke-width="${LINE}"/>`);
    sq.push(`<text id="calibration-label" x="${r(cx - s4 / 2)}" y="${r(cy - s4 / 2 - 4)}" font-size="6" fill="${CUT}">4 in (101.6 mm) square: measure to check the scale</text>`);
    if (big) {
      const half = inches ? 4 * IN : 100;
      sq.push(`<rect x="${r(cx - half)}" y="${r(cy - half)}" width="${r(2 * half)}" height="${r(2 * half)}" fill="none" stroke="${CUT}" stroke-width="${LINE}" stroke-dasharray="10 5"/>`);
      sq.push(`<text x="${r(cx - half)}" y="${r(cy + half + 8)}" font-size="6" fill="${CUT}">${inches ? '8 in' : '20 cm'} square</text>`);
    }
    for (const [x, y] of [[m, m], [width - m - c, m], [m, height - m - c], [width - m - c, height - m - c]]) {
      sq.push(`<rect x="${r(x)}" y="${r(y)}" width="${r(c)}" height="${r(c)}" fill="none" stroke="${CUT}" stroke-width="${LINE}"/>`);
      sq.push(`<text x="${r(x + 3)}" y="${r(y + 8)}" font-size="5" fill="${CUT}">${cornerLabel}</text>`);
    }
    layer('Calibration', sq.join('\n'));
  }

  // ---- instructions, wrapped into the band that is free of squares
  {
    const paragraphs = [
      [`${name}: ${purpose}`, true],
      [big
        ? `Calibrate the projector, then measure the 4 in square at the centre and the ${cornerLabel} square in each corner. Centre right but corners differ: keystone. One side long: skew. Circle not round: both. Everything the same but wrong: scale.`
        : `Measure the 4 in square and the ${cornerLabel} corner squares. All wrong by the same amount: the printer is scaling. Corners differ: the paper slipped.`, false],
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

  return svg(width, height, name, parts);
}

function svg(width, height, name, parts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
<title>${esc(name)}</title>
<rect width="${width}" height="${height}" fill="#ffffff"/>
${parts.join('\n')}
</svg>
`;
}

const DOT = '#e8731a'; // the orange of the dots
const DOT_LABEL = '#646b70';

/** Whole steps from the near edge, then the far edge, as Lantern places its calibration points. */
export function stops(length, step) {
  const out = [];
  for (let k = 0; k * step < length - 1e-6; k++) out.push(k * step);
  out.push(length);
  return out;
}

/** An orange ring the size of a dot with a crosshair that leaves the centre clear, so the dot can be seen to land in the middle. */
function target(x, y, dot) {
  const rad = dot / 2;
  const arm = rad * 0.4;
  return [
    `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad)}" fill="none" stroke="${DOT}" stroke-width="0.5"/>`,
    `<line x1="${r(x - rad)}" y1="${r(y)}" x2="${r(x - arm)}" y2="${r(y)}" stroke="${DOT}" stroke-width="0.35"/>`,
    `<line x1="${r(x + arm)}" y1="${r(y)}" x2="${r(x + rad)}" y2="${r(y)}" stroke="${DOT}" stroke-width="0.35"/>`,
    `<line x1="${r(x)}" y1="${r(y - rad)}" x2="${r(x)}" y2="${r(y - arm)}" stroke="${DOT}" stroke-width="0.35"/>`,
    `<line x1="${r(x)}" y1="${r(y + arm)}" x2="${r(x)}" y2="${r(y + rad)}" stroke="${DOT}" stroke-width="0.35"/>`,
  ].join('\n');
}

/**
 * A layout for drawing a mat: lines every `lineEvery` (12 in) and a target
 * for a dot at every `dotEvery` (6 in) crossing, counted from the top-left
 * corner with the far edge last, the way Lantern places its calibration
 * points, so a dot stuck in each target is exactly where Auto will look.
 * Each target is labelled with its distance from the corner in inches, as
 * Lantern labels the point. Project it through a calibration made on the
 * four corners of the mat, draw the lines, stick the dots, then check with
 * a tape: the numbers to check are in the Check layer.
 */
export function layout({ width, height, name, purpose, lineEvery = 12 * IN, dotEvery = 6 * IN, dot = 8 }) {
  const parts = [];
  const layer = (label, body) =>
    parts.push(`<g inkscape:groupmode="layer" inkscape:label="${esc(label)}" id="${esc(label.toLowerCase().replace(/\W+/g, '-'))}">\n${body}\n</g>`);
  const inches = (mm) => `${r(mm / IN)}`;

  {
    const lines = [];
    for (let i = 1; i * lineEvery < width - 1e-6; i++) {
      const x = r(i * lineEvery);
      lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${SEW}" stroke-width="1"/>`);
      lines.push(`<text x="${r(x + 2)}" y="${r(height / 2)}" font-size="5" fill="${SEW}">${inches(i * lineEvery)} in</text>`);
    }
    for (let i = 1; i * lineEvery < height - 1e-6; i++) {
      const y = r(i * lineEvery);
      lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${SEW}" stroke-width="1"/>`);
      lines.push(`<text x="${r(width / 2 + 2)}" y="${r(y - 2)}" font-size="5" fill="${SEW}">${inches(i * lineEvery)} in</text>`);
    }
    layer(`Lines every ${inches(lineEvery)} in`, lines.join('\n'));
  }

  const xs = stops(width, dotEvery);
  const ys = stops(height, dotEvery);
  {
    const dots = [];
    const labels = [];
    for (const y of ys) {
      for (const x of xs) {
        dots.push(target(x, y, dot));
        const lx = x >= width - dot ? x - dot / 2 - 2 : x + dot / 2 + 1.5;
        const ly = y >= height - dot ? y - dot / 2 - 1 : y + dot / 2 + 4;
        labels.push(`<text x="${r(lx)}" y="${r(ly)}" font-size="3.5" fill="${DOT_LABEL}"${x >= width - dot ? ' text-anchor="end"' : ''}>${inches(x)} × ${inches(y)}</text>`);
      }
    }
    layer(`Dots every ${inches(dotEvery)} in`, dots.join('\n'));
    layer('Labels', labels.join('\n'));
  }

  {
    const diagonal = Math.hypot(width, height);
    const text = [
      [`${name}: ${purpose}`, true],
      [`${xs.length} × ${ys.length} dots, ${dot} mm, every ${inches(dotEvery)} in from the top-left corner and then the far edge, with lines every ${inches(lineEvery)} in. Project this through a calibration set on the four corners of the mat, draw along the lines, stick a dot in the middle of each target.`, false],
      [`Then check with a tape, measuring to the middle of the lines: ${inches(lineEvery)} in between lines, ${inches(width)} in across, ${inches(height)} in down, and corner to corner ${r(diagonal / IN)} in (${r(diagonal)} mm). Any dot is also ${inches(dotEvery)} in from its neighbours.`, false],
    ];
    const x0 = dot + 6;
    const x1 = width - dot - 6;
    const size = 5;
    const lineHeight = size * 1.45;
    const out = [];
    let y = dot + 8 + size;
    for (const [para, bold] of text) {
      for (const line of wrap(para, Math.floor((x1 - x0) / (size * 0.52)))) {
        out.push(`<text x="${x0}" y="${r(y)}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${CUT}">${esc(line)}</text>`);
        y += lineHeight;
      }
      y += lineHeight * 0.3;
    }
    layer('Check', out.join('\n'));
  }

  layer('Border', `<rect x="${LINE / 2}" y="${LINE / 2}" width="${r(width - LINE)}" height="${r(height - LINE)}" fill="none" stroke="${BORDER}" stroke-width="${LINE}"/>`);
  return svg(width, height, name, parts);
}

/**
 * A sheet of dots to cut from vinyl on a cutting machine: `columns` ×
 * `rows` filled circles of `dot` mm, `pitch` mm apart, with half a pitch
 * of margin, so the sheet is columns × pitch wide. Nothing but the circles,
 * since a cutting machine cuts everything it is given: no text, no border.
 * Sized in millimetres in the SVG itself, which Cricut Design Space reads.
 */
export function dots({ name, columns = 10, rows = 10, dot = 8, pitch = 12 }) {
  const width = columns * pitch;
  const height = rows * pitch;
  const circles = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      circles.push(`<circle cx="${r((i + 0.5) * pitch)}" cy="${r((j + 0.5) * pitch)}" r="${r(dot / 2)}" fill="${DOT}"/>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${r(width)}mm" height="${r(height)}mm" viewBox="0 0 ${r(width)} ${r(height)}">
<title>${esc(name)}</title>
${circles.join('\n')}
</svg>
`;
}

/**
 * A page to print at 100%: a square of `cell` (6 in) with a dot target at
 * each corner, for marking or checking dots on a mat a cell at a time, and
 * a 4 in square to check the printer's scale first.
 */
export function tile({ width, height, name, purpose, cell = 6 * IN, dot = 8 }) {
  const parts = [];
  const layer = (label, body) =>
    parts.push(`<g inkscape:groupmode="layer" inkscape:label="${esc(label)}" id="${esc(label.toLowerCase().replace(/\W+/g, '-'))}">\n${body}\n</g>`);
  const x0 = (width - cell) / 2;
  const y0 = (height - cell) / 2 + 10;
  const items = [`<rect x="${r(x0)}" y="${r(y0)}" width="${r(cell)}" height="${r(cell)}" fill="none" stroke="${SEW}" stroke-width="0.5" stroke-dasharray="4 3"/>`];
  for (const [x, y] of [[x0, y0], [x0 + cell, y0], [x0, y0 + cell], [x0 + cell, y0 + cell]]) items.push(target(x, y, dot));
  items.push(`<text x="${r(x0 + cell / 2)}" y="${r(y0 + cell / 2)}" text-anchor="middle" font-size="6" fill="${SEW}">${r(cell / IN)} in between dot centres</text>`);
  layer('Tile', items.join('\n'));
  const s4 = 4 * IN;
  layer('Calibration', [
    `<rect id="calibration-square" inkscape:label="calibration-square" x="${r(width / 2 - s4 / 2)}" y="${r(y0 + cell / 2 - s4 / 2)}" width="${r(s4)}" height="${r(s4)}" fill="none" stroke="${CUT}" stroke-width="0.5"/>`,
    `<text id="calibration-label" x="${r(width / 2 - s4 / 2)}" y="${r(y0 + cell / 2 + s4 / 2 + 5)}" font-size="4" fill="${CUT}">4 in (101.6 mm) square: measure to check the print is at 100%</text>`,
  ].join('\n'));
  {
    const text = [
      [`${name}: ${purpose}`, true],
      [`Print at 100% (no fit to page) and measure the 4 in square. Lay the page on the mat with two targets on two dots already in place, and mark the other two through the centres with a pin or a pencil; or lay it over four dots to check them. The targets are ${dot} mm, the size of a dot.`, false],
    ];
    const size = 4;
    const lineHeight = size * 1.45;
    const out = [];
    let y = 12 + size;
    for (const [para, bold] of text) {
      for (const line of wrap(para, Math.floor((width - 24) / (size * 0.52)))) {
        out.push(`<text x="12" y="${r(y)}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${CUT}">${esc(line)}</text>`);
        y += lineHeight;
      }
      y += lineHeight * 0.3;
    }
    layer('Instructions', out.join('\n'));
  }
  layer('Border', `<rect x="${LINE / 2}" y="${LINE / 2}" width="${r(width - LINE)}" height="${r(height - LINE)}" fill="none" stroke="${BORDER}" stroke-width="${LINE}"/>`);
  return svg(width, height, name, parts);
}
