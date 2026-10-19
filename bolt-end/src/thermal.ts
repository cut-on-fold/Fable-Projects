// Labels for a Niimbot thermal printer: sizes, text layout and drawing to a
// canvas at the printer's resolution. The B21 prints 203 dots an inch across
// a 384-dot head, so a 50 mm label is 384 px wide and the length is 8 px a
// millimetre. The layout is pure (text measuring is injected) so it can be
// tested; drawing needs a canvas.

export const DOTS_PER_MM = 8;
export const HEAD_DOTS = 384;
export const HEAD_MM = HEAD_DOTS / DOTS_PER_MM;

export interface ThermalLabel {
  id: string;
  name: string;
  /** Across the print head, mm. */
  width: number;
  /** Along the feed, mm. */
  length: number;
  fontPt: number;
  custom?: boolean;
}

export const THERMAL_LABELS: ThermalLabel[] = [
  { id: 'b21-50x30', name: 'Niimbot B21 · 50 × 30 mm', width: 50, length: 30, fontPt: 8 },
  { id: 'b21-50x15', name: 'Niimbot B21 · 50 × 15 mm', width: 50, length: 15, fontPt: 5.5 },
  { id: 'b21-50x20', name: 'Niimbot B21 · 50 × 20 mm', width: 50, length: 20, fontPt: 6.5 },
  { id: 'b21-50x40', name: 'Niimbot B21 · 50 × 40 mm', width: 50, length: 40, fontPt: 9 },
  { id: 'b21-50x50', name: 'Niimbot B21 · 50 × 50 mm', width: 50, length: 50, fontPt: 10 },
  { id: 'b21-50x70', name: 'Niimbot B21 · 50 × 70 mm', width: 50, length: 70, fontPt: 11 },
  { id: 'b21-40x30', name: 'Niimbot B21 · 40 × 30 mm', width: 40, length: 30, fontPt: 7.5 },
  { id: 'b21-40x20', name: 'Niimbot B21 · 40 × 20 mm', width: 40, length: 20, fontPt: 6.5 },
  { id: 'b21-30x15', name: 'Niimbot B21 · 30 × 15 mm', width: 30, length: 15, fontPt: 5.5 },
  { id: 'b21-30x20', name: 'Niimbot B21 · 30 × 20 mm', width: 30, length: 20, fontPt: 6 },
  { id: 'b21-custom', name: 'Niimbot B21 · another size', width: 50, length: 30, fontPt: 8, custom: true },
];

/** Pixel size of a label's printable area: the head is 48 mm, so a 50 mm label loses 1 mm each side. */
export function thermalPixels(label: { width: number; length: number }): { width: number; height: number } {
  return { width: Math.round(Math.min(label.width, HEAD_MM) * DOTS_PER_MM), height: Math.round(label.length * DOTS_PER_MM) };
}

/** Points to pixels at the printer's resolution. */
export function ptToPx(pt: number): number {
  return (pt * 25.4 * DOTS_PER_MM) / 72;
}

export type Measure = (text: string, font: string) => number;

/** Break text into lines no wider than `maxWidth` by the given measure; a word wider than the line stands alone. */
export function wrapText(text: string, maxWidth: number, font: string, measure: Measure): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (line && measure(candidate, font) > maxWidth) {
      lines.push(line);
      line = w;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export interface Placed {
  text: string;
  x: number;
  /** Baseline. */
  y: number;
  font: string;
}

export interface LayoutSpec {
  width: number;
  height: number;
  pad: number;
  fontPx: number;
  family: string;
}

export interface Layout {
  placed: Placed[];
  /** Lines that did not fit. */
  dropped: number;
}

/**
 * Title (bold, larger, up to two lines) then the lines, each wrapped, with
 * continuation lines indented. Stops when the label is full.
 */
export function layoutLabel(title: string, lines: string[], spec: LayoutSpec, measure: Measure): Layout {
  const placed: Placed[] = [];
  const maxWidth = spec.width - 2 * spec.pad;
  const titlePx = Math.round(spec.fontPx * 1.25);
  const titleFont = `bold ${titlePx}px ${spec.family}`;
  const lineFont = `${Math.round(spec.fontPx)}px ${spec.family}`;
  const titleLead = titlePx * 1.1;
  const lineLead = spec.fontPx * 1.22;
  const bottom = spec.height - spec.pad;
  let y = spec.pad + titlePx * 0.92;
  let dropped = 0;

  const titleLines = wrapText(title, maxWidth, titleFont, measure).slice(0, 2);
  for (const t of titleLines) {
    if (y > bottom) {
      dropped++;
      continue;
    }
    placed.push({ text: t, x: spec.pad, y: Math.round(y), font: titleFont });
    y += titleLead;
  }
  y += lineLead * 0.2;
  const indent = measure('  ', lineFont);
  for (const line of lines) {
    const parts = wrapText(line, maxWidth, lineFont, measure);
    let first = true;
    for (const p of parts) {
      const x = first ? spec.pad : spec.pad + indent;
      if (y > bottom) {
        dropped++;
        break;
      }
      placed.push({ text: p, x, y: Math.round(y), font: lineFont });
      y += lineLead;
      first = false;
    }
  }
  return { placed, dropped };
}

export const LABEL_FAMILY = "'Atkinson Hyperlegible', 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Draw one label to a fresh canvas at printer resolution: black text on white. */
export function drawLabel(title: string, lines: string[], label: { width: number; length: number }, fontPt: number): { canvas: HTMLCanvasElement; dropped: number } {
  const { width, height } = thermalPixels(label);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const measure: Measure = (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
  const spec: LayoutSpec = { width, height, pad: Math.round(1.5 * DOTS_PER_MM), fontPx: ptToPx(fontPt), family: LABEL_FAMILY };
  const layout = layoutLabel(title, lines, spec, measure);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'alphabetic';
  for (const p of layout.placed) {
    ctx.font = p.font;
    ctx.fillText(p.text, p.x, p.y);
  }
  return { canvas, dropped: layout.dropped };
}
