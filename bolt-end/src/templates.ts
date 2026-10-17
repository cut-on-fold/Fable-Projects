// Label sheets and card layouts. All sizes in millimetres. The Avery figures
// are the published sheet layouts; print one sheet on plain paper and hold it
// against the labels before printing on the real thing.

export interface Template {
  id: string;
  name: string;
  page: 'A4' | 'Letter';
  cols: number;
  rows: number;
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
  /** Leaves a square on the left of each label for a stapled swatch. */
  swatch: boolean;
  /** Draws a cutting line round each label, for plain paper or card. */
  outline: boolean;
  /** Side of the swatch square, mm. */
  swatchSize: number;
  /** Text size that suits the label, pt. */
  fontPt: number;
}

const IN = 25.4;

export const PAGE_SIZES: Record<Template['page'], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 8.5 * IN, height: 11 * IN },
};

export const TEMPLATES: Template[] = [
  { id: 'L7160', name: 'Avery L7160 · 21 labels 63.5 × 38.1 mm (A4)', page: 'A4', cols: 3, rows: 7, width: 63.5, height: 38.1, marginTop: 15.15, marginLeft: 7.2, gapX: 2.54, gapY: 0, swatch: false, outline: false, swatchSize: 0, fontPt: 8 },
  { id: 'L7163', name: 'Avery L7163 · 14 labels 99.1 × 38.1 mm (A4)', page: 'A4', cols: 2, rows: 7, width: 99.1, height: 38.1, marginTop: 15.15, marginLeft: 4.65, gapX: 2.5, gapY: 0, swatch: false, outline: false, swatchSize: 0, fontPt: 8 },
  { id: 'L7165', name: 'Avery L7165 · 8 labels 99.1 × 67.7 mm (A4)', page: 'A4', cols: 2, rows: 4, width: 99.1, height: 67.7, marginTop: 13.1, marginLeft: 4.65, gapX: 2.5, gapY: 0, swatch: false, outline: false, swatchSize: 0, fontPt: 8 },
  { id: 'L7173', name: 'Avery L7173 · 10 labels 99.1 × 57 mm (A4)', page: 'A4', cols: 2, rows: 5, width: 99.1, height: 57, marginTop: 6, marginLeft: 4.65, gapX: 2.5, gapY: 0, swatch: false, outline: false, swatchSize: 0, fontPt: 8 },
  { id: '5160', name: 'Avery 5160 · 30 labels 2⅝ × 1 in (Letter)', page: 'Letter', cols: 3, rows: 10, width: 2.625 * IN, height: 1 * IN, marginTop: 0.5 * IN, marginLeft: 0.1875 * IN, gapX: 0.125 * IN, gapY: 0, swatch: false, outline: false, swatchSize: 0, fontPt: 6.5 },
  { id: '5163', name: 'Avery 5163 · 10 labels 4 × 2 in (Letter)', page: 'Letter', cols: 2, rows: 5, width: 4 * IN, height: 2 * IN, marginTop: 0.5 * IN, marginLeft: 0.15625 * IN, gapX: 0.1875 * IN, gapY: 0, swatch: false, outline: false, swatchSize: 0, fontPt: 8 },
  { id: 'cards-a4', name: 'Swatch cards · 6 per A4, 90 × 85 mm, with a swatch square', page: 'A4', cols: 2, rows: 3, width: 90, height: 85, marginTop: 15, marginLeft: 10, gapX: 10, gapY: 6, swatch: true, outline: true, swatchSize: 42, fontPt: 10 },
  { id: 'cards-letter', name: 'Swatch cards · 6 per Letter, 3½ × 3⅓ in, with a swatch square', page: 'Letter', cols: 2, rows: 3, width: 3.5 * IN, height: 3.33 * IN, marginTop: 0.5 * IN, marginLeft: 0.5 * IN, gapX: 0.5 * IN, gapY: 0.25 * IN, swatch: true, outline: true, swatchSize: 42, fontPt: 10 },
  { id: 'tags-a4', name: 'Hang tags · 12 per A4, 60 × 42 mm, outlined to cut', page: 'A4', cols: 3, rows: 4, width: 60, height: 42, marginTop: 20, marginLeft: 12, gapX: 3, gapY: 20, swatch: false, outline: true, swatchSize: 0, fontPt: 9 },
];

export function perPage(t: Template): number {
  return t.cols * t.rows;
}

/** Top-left corner of label `k` (0-based) on its page. */
export function position(t: Template, k: number): { x: number; y: number } {
  const col = k % t.cols;
  const row = Math.floor(k / t.cols);
  return { x: t.marginLeft + col * (t.width + t.gapX), y: t.marginTop + row * (t.height + t.gapY) };
}

/** Whether the layout fits on its page. */
export function fits(t: Template): boolean {
  const p = PAGE_SIZES[t.page];
  const last = position(t, perPage(t) - 1);
  return last.x + t.width <= p.width + 0.01 && last.y + t.height <= p.height + 0.01;
}
