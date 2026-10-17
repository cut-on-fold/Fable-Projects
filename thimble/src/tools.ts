// The calculators as data: fields in, rows out. main.ts draws them.

import { biasFromPiece, bindingNeeded, squareForBias, stripWidthFor, type BindingFold } from './calc/bias';
import { circleSkirt } from './calc/circle';
import { finishedFromStrip, ruffle } from './calc/gathers';
import { buttonholeLength, placeButtons, type ButtonInput, type ButtonShape } from './calc/buttons';
import { BAND_KINDS, ELASTIC_KINDS, elasticLength, knitBand } from './calc/elastic';
import { pleats, type PleatStyle } from './calc/pleats';
import { convertWidth, widthChart } from './calc/width';
import { lengthToBuy, shrinkage } from './calc/shrinkage';
import { easeFromFinished, stretchBand, stretchPercent, withNegativeEase } from './calc/stretch';
import { searchNeedles } from './calc/needles';
import { STITCH_KINDS, TYPICAL_SEAMS, threadNeeded } from './calc/thread';
import { allowanceChange, finishedFromFlat } from './calc/allowance';
import { CM_PER_IN, formatBuy, formatLength, formatPercent, type Unit } from './units';

export type Value = number | string | boolean | null;
export type Values = Record<string, Value>;

/** A default that differs by unit: `in` is given in inches. */
export type UnitDefault = number | { cm: number; in: number };

interface FieldBase {
  key: string;
  label: string;
  hint?: string;
  wide?: boolean;
  showIf?: (v: Values) => boolean;
}
export type Field =
  | (FieldBase & { kind: 'length'; default: UnitDefault | null; /** typed and shown in metres or yards */ long?: boolean })
  | (FieldBase & { kind: 'number'; default: number | null; suffix?: string })
  | (FieldBase & { kind: 'percent'; default: number | null })
  | (FieldBase & { kind: 'int'; default: number | null })
  | (FieldBase & { kind: 'select'; default: string; options: Array<{ value: string; label: string }>; sets?: (value: string) => Values })
  | (FieldBase & { kind: 'check'; default: boolean })
  | (FieldBase & { kind: 'text'; default: string; placeholder?: string });

export interface Cell { text: string; cls?: string }
export interface Output {
  headline?: { label: string; value: string; note?: string };
  rows?: Array<{ label: string; value: string; sub?: string }>;
  table?: { head: string[]; rows: Cell[][]; numeric?: boolean[] };
  notes?: string[];
  warn?: string;
  cards?: Array<{ title: string; subtitle: string; pairs: Array<[string, string]>; tip: string }>;
  empty?: string;
}

export interface Tool {
  id: string;
  name: string;
  blurb: string;
  fields: Field[];
  compute: (v: Values, unit: Unit) => Output;
}

export function resolveDefault(d: UnitDefault | null, unit: Unit): number | null {
  if (d === null) return null;
  if (typeof d === 'number') return d;
  return unit === 'in' ? d.in * CM_PER_IN : d.cm;
}

const num = (v: Values, key: string): number | null => (typeof v[key] === 'number' ? (v[key] as number) : null);
const str = (v: Values, key: string): string => (typeof v[key] === 'string' ? (v[key] as string) : '');
const bool = (v: Values, key: string): boolean => v[key] === true;
const pct = (v: Values, key: string): number | null => {
  const n = num(v, key);
  return n === null ? null : n / 100;
};

const SA: UnitDefault = { cm: 1.5, in: 0.625 };
const SA_NARROW: UnitDefault = { cm: 1, in: 0.375 };
const WIDTH: UnitDefault = { cm: 150, in: 60 };
const WIDTH_NARROW: UnitDefault = { cm: 115, in: 45 };

export const TOOLS: Tool[] = [
  {
    id: 'bias',
    name: 'Bias strips',
    blurb: 'How much continuous bias a square or offcut gives, how big a square to cut for a length you need, and the strip width for a binding.',
    fields: [
      { key: 'strip', kind: 'length', label: 'Strip width', default: { cm: 4, in: 1.5 }, hint: 'The cut width of each bias strip.' },
      { key: 'wanted', kind: 'length', long: true, label: 'Bias wanted', default: null, hint: 'Leave blank if you are starting from a piece of fabric.' },
      { key: 'w', kind: 'length', label: 'Piece width', default: { cm: 45, in: 18 } },
      { key: 'h', kind: 'length', label: 'Piece height', default: { cm: 45, in: 18 } },
      { key: 'finished', kind: 'length', label: 'Finished binding width', default: { cm: 1.2, in: 0.5 }, hint: 'The width you see once the binding is sewn.' },
      { key: 'fold', kind: 'select', label: 'Binding', default: 'double', options: [{ value: 'double', label: 'Double fold' }, { value: 'single', label: 'Single fold' }] },
      { key: 'thick', kind: 'check', label: 'Thick fabric (add a little for the turn)', default: false },
      { key: 'edge', kind: 'length', label: 'Edge to bind', default: null, hint: 'Optional: the length of the edge, for how much binding to make.' },
    ],
    compute(v, unit) {
      const strip = num(v, 'strip');
      if (strip === null) return { empty: 'Give a strip width.' };
      const L = (cm: number) => formatLength(cm, unit, { long: true });
      const out: Output = { rows: [], notes: [] };
      const w = num(v, 'w');
      const h = num(v, 'h');
      if (w !== null && h !== null) {
        const r = biasFromPiece(w, h, strip);
        if (r) {
          out.headline = { label: 'Bias from this piece', value: L(r.length), note: `${r.strips} strips of ${formatLength(strip, unit)}, joined on the diagonal` };
          if (r.length === 0) out.warn = 'The piece is smaller than one strip.';
        }
      }
      const wanted = num(v, 'wanted');
      if (wanted !== null) {
        const side = squareForBias(wanted, strip);
        if (side) {
          const row = { label: `Square for ${L(wanted)} of bias`, value: `${formatLength(side, unit)} square` };
          if (!out.headline) out.headline = { label: 'Square to cut', value: row.value, note: `for ${L(wanted)} of bias ${formatLength(strip, unit)} wide` };
          else out.rows!.push(row);
        }
      }
      const finished = num(v, 'finished');
      if (finished !== null) {
        const fold = str(v, 'fold') as BindingFold;
        out.rows!.push({ label: `Cut width for ${formatLength(finished, unit)} ${fold}-fold binding`, value: formatLength(stripWidthFor(finished, fold, bool(v, 'thick')), unit) });
      }
      const edge = num(v, 'edge');
      if (edge !== null) {
        const overlap = unit === 'in' ? 10 * CM_PER_IN : 25;
        out.rows!.push({ label: 'Binding to make for the edge', value: L(bindingNeeded(edge, overlap)), sub: `Edge plus ${formatLength(overlap, unit)} for the join.` });
      }
      out.notes!.push('The estimate takes a tenth off for the diagonal joins and squaring up. A fat quarter gives about 3 m (3 yd) of 4 cm (1½ in) bias.');
      if (!out.headline && !out.rows!.length) return { empty: 'Give a piece size or a length wanted.' };
      return out;
    },
  },
  {
    id: 'circle',
    name: 'Circle skirt',
    blurb: 'Waist radius, hem radius, hem length and the fabric a circle skirt takes, from a full circle to a quarter.',
    fields: [
      { key: 'waist', kind: 'length', label: 'Waist', default: { cm: 76, in: 30 }, hint: 'Where the skirt sits. Use the hip if it has to pull on.' },
      { key: 'ease', kind: 'length', label: 'Ease', default: { cm: 2, in: 0.75 }, hint: 'Added to the waist. 0 for a bias-cut waist that will stretch.' },
      { key: 'fraction', kind: 'select', label: 'Circle', default: '1', options: [{ value: '2', label: 'Double circle' }, { value: '1', label: 'Full circle' }, { value: '0.75', label: 'Three-quarter circle' }, { value: '0.5', label: 'Half circle' }, { value: '0.25', label: 'Quarter circle' }] },
      { key: 'length', kind: 'length', label: 'Skirt length', default: { cm: 60, in: 24 }, hint: 'Finished, waist seam to hem.' },
      { key: 'waistSA', kind: 'length', label: 'Waist seam allowance', default: SA_NARROW },
      { key: 'hem', kind: 'length', label: 'Hem allowance', default: SA_NARROW, hint: 'Circle hems are narrow; 1 cm (⅜ in) is plenty.' },
      { key: 'panelSA', kind: 'length', label: 'Panel seam allowance', default: SA, hint: 'On the straight edges when the skirt is cut in panels.' },
      { key: 'width', kind: 'length', label: 'Fabric width', default: WIDTH },
    ],
    compute(v, unit) {
      const waist = num(v, 'waist');
      const length = num(v, 'length');
      if (waist === null || length === null) return { empty: 'Give the waist and the skirt length.' };
      const r = circleSkirt({
        waist, length, ease: num(v, 'ease') ?? 0, fraction: parseFloat(str(v, 'fraction')) || 1,
        waistAllowance: num(v, 'waistSA') ?? 0, hemAllowance: num(v, 'hem') ?? 0, seamAllowance: num(v, 'panelSA') ?? 0, fabricWidth: num(v, 'width') ?? 0,
      });
      if (!r) return { empty: 'Check the waist and length.' };
      const L = (cm: number) => formatLength(cm, unit);
      const out: Output = {
        headline: { label: 'Waist radius, cut edge', value: L(r.waistCutRadius), note: `${L(r.waistRadius)} to the stitching line. Measure from the folded corner.` },
        rows: [
          { label: 'Hem radius, cut edge', value: L(r.outerRadius) },
          { label: 'Finished hem length', value: formatLength(r.hemLength, unit, { long: true }), sub: 'For hem tape, bias facing or a rolled hem.' },
        ],
        notes: [
          'Let the skirt hang for a day before hemming: the bias parts drop.',
          'Stay the waist seam with tape or clear elastic so it cannot stretch.',
        ],
      };
      if (r.fabricLength === null) {
        out.warn = num(v, 'width') ? 'One panel is wider than the fabric. Shorten the skirt, use more panels, or piece the fabric.' : 'Give a fabric width for the fabric needed.';
      } else if (r.onePiece) {
        out.rows!.push({ label: 'Fabric needed', value: formatBuy(r.fabricLength, unit), sub: r.panels === 0 && parseFloat(str(v, 'fraction')) === 1 ? 'One piece cut on a double fold.' : 'One piece cut on the fold.' });
      } else {
        out.rows!.push({ label: 'Fabric needed', value: formatBuy(r.fabricLength, unit), sub: `${r.panels} quarter-circle panels, ${r.across} across the width, seam allowances included.` });
      }
      return out;
    },
  },
  {
    id: 'gathers',
    name: 'Gathers and ruffles',
    blurb: 'Cut length for a gathered edge or ruffle, how many strips that is across the fabric, and the fabric to cut.',
    fields: [
      { key: 'finished', kind: 'length', label: 'Finished length', default: { cm: 100, in: 40 }, hint: 'The edge the ruffle is sewn to.' },
      { key: 'ratio', kind: 'number', label: 'Gathering ratio', default: 2, suffix: '×', hint: '1.5 light, 2 full, 2.5–3 for sheers.' },
      { key: 'depth', kind: 'length', label: 'Finished depth', default: { cm: 10, in: 4 } },
      { key: 'hem', kind: 'length', label: 'Hem', default: SA_NARROW },
      { key: 'double', kind: 'check', label: 'Double-fold hem', default: true },
      { key: 'sa', kind: 'length', label: 'Seam allowance', default: SA },
      { key: 'width', kind: 'length', label: 'Fabric width', default: WIDTH },
      { key: 'have', kind: 'length', label: 'Strip you already have', default: null, hint: 'Optional: what it gathers down to at this ratio.' },
    ],
    compute(v, unit) {
      const finished = num(v, 'finished');
      const ratio = num(v, 'ratio');
      if (finished === null || ratio === null) return { empty: 'Give the finished length and a ratio.' };
      const r = ruffle({ finishedLength: finished, ratio, finishedDepth: num(v, 'depth') ?? 0, hem: num(v, 'hem') ?? 0, doubleFoldHem: bool(v, 'double'), seamAllowance: num(v, 'sa') ?? 0, fabricWidth: num(v, 'width') ?? 0 });
      if (!r) return { empty: 'Check the numbers: the seam allowance is wider than the fabric.' };
      const out: Output = {
        headline: { label: 'Cut length', value: formatLength(r.cutLength, unit, { long: true }), note: `${ratio}× the finished length` },
        rows: [{ label: 'Cut depth', value: formatLength(r.cutDepth, unit), sub: 'Finished depth, hem and seam allowance.' }],
        notes: ['Two rows of gathering stitches, longest stitch, either side of the seam line. Quarter both edges and match the marks before pulling up.'],
      };
      if (r.strips) {
        out.rows!.push({ label: 'Strips across the fabric', value: `${r.strips}` });
        out.rows!.push({ label: 'Fabric to cut', value: formatLength(r.fabricLength, unit, { long: true }), sub: 'Strips cut across the width, selvedge to selvedge.' });
      }
      const have = num(v, 'have');
      if (have !== null) {
        const f = finishedFromStrip(have, ratio);
        if (f) out.rows!.push({ label: `A ${formatLength(have, unit, { long: true })} strip gathers to`, value: formatLength(f, unit, { long: true }) });
      }
      return out;
    },
  },
  {
    id: 'buttons',
    name: 'Buttons',
    blurb: 'Even spacing down a placket by count, by spacing, or stepping out from one button that has to sit at the bust. And the buttonhole length.',
    fields: [
      { key: 'mode', kind: 'select', label: 'Place by', default: 'count', options: [{ value: 'count', label: 'Number of buttons' }, { value: 'spacing', label: 'Spacing' }, { value: 'anchor', label: 'One fixed button, then spacing' }] },
      { key: 'length', kind: 'length', label: 'Placket length', default: { cm: 60, in: 24 }, hint: 'Top edge to bottom edge of the opening.' },
      { key: 'count', kind: 'int', label: 'Buttons', default: 7, showIf: (v) => v.mode === 'count' },
      { key: 'spacing', kind: 'length', label: 'Spacing', default: { cm: 8, in: 3 }, showIf: (v) => v.mode !== 'count' },
      { key: 'anchor', kind: 'length', label: 'Fixed button, from the top', default: { cm: 25, in: 10 }, hint: 'The bust line, say.', showIf: (v) => v.mode === 'anchor' },
      { key: 'top', kind: 'length', label: 'First button from the top', default: { cm: 1.5, in: 0.625 }, hint: 'In anchor mode: the closest a button may come to the top.' },
      { key: 'bottom', kind: 'length', label: 'Last button from the bottom', default: { cm: 7.5, in: 3 }, hint: 'Shirts stop a hand’s width above the hem.' },
      { key: 'diameter', kind: 'length', label: 'Button diameter', default: { cm: 1.2, in: 0.5 } },
      { key: 'thickness', kind: 'length', label: 'Button thickness', default: { cm: 0.3, in: 0.125 } },
      { key: 'shape', kind: 'select', label: 'Button shape', default: 'flat', options: [{ value: 'flat', label: 'Flat' }, { value: 'domed', label: 'Domed or shank' }, { value: 'ball', label: 'Ball' }] },
    ],
    compute(v, unit) {
      const length = num(v, 'length');
      if (length === null) return { empty: 'Give the placket length.' };
      const mode = str(v, 'mode');
      const top = num(v, 'top') ?? 0;
      const bottom = num(v, 'bottom') ?? 0;
      let input: ButtonInput;
      if (mode === 'count') input = { mode, length, count: num(v, 'count') ?? 0, top, bottom };
      else if (mode === 'spacing') input = { mode, length, spacing: num(v, 'spacing') ?? 0, top, bottom };
      else input = { mode: 'anchor', length, spacing: num(v, 'spacing') ?? 0, anchor: num(v, 'anchor') ?? 0, top, bottom };
      const r = placeButtons(input);
      const L = (cm: number) => formatLength(cm, unit);
      const out: Output = { rows: [], notes: [] };
      if (!r) {
        out.warn = mode === 'anchor' ? 'The fixed button is outside the top and bottom limits.' : 'The buttons do not fit between the top and bottom offsets.';
      } else {
        out.headline = { label: mode === 'count' ? 'Spacing' : 'Buttons', value: mode === 'count' ? L(r.spacing) : `${r.positions.length}`, note: mode === 'count' ? `${r.positions.length} buttons` : `${L(r.spacing)} apart` };
        out.table = { head: ['Button', 'From the top', 'From the bottom'], numeric: [false, true, true], rows: r.positions.map((p, k) => [{ text: `${k + 1}` }, { text: L(p) }, { text: L(length - p) }]) };
      }
      const d = num(v, 'diameter');
      const t = num(v, 'thickness');
      if (d !== null && t !== null) {
        const bh = buttonholeLength(d, t, str(v, 'shape') as ButtonShape);
        if (bh) out.rows!.push({ label: 'Buttonhole length', value: L(bh), sub: 'Diameter plus thickness plus 3 mm. Test on a scrap of the same layers.' });
      }
      out.notes!.push('Horizontal buttonholes start 3 mm (⅛ in) past the centre front towards the edge; vertical ones sit on the centre front line.');
      return out;
    },
  },
  {
    id: 'elastic',
    name: 'Elastic',
    blurb: 'How long to cut elastic for a waist, leg or neckline, by the kind of elastic.',
    fields: [
      { key: 'kind', kind: 'select', label: 'Elastic', default: 'knitted', options: ELASTIC_KINDS.map((k) => ({ value: k.id, label: k.name })), sets: (id) => ({ reduction: (ELASTIC_KINDS.find((k) => k.id === id)?.reduction ?? 0.08) * 100 }), wide: true },
      { key: 'body', kind: 'length', label: 'Body measurement', default: { cm: 80, in: 31.5 }, hint: 'Waist, leg opening, or the seam line of a neckline.' },
      { key: 'reduction', kind: 'percent', label: 'Take off', default: 8 },
      { key: 'overlap', kind: 'length', label: 'Overlap for the join', default: { cm: 2.5, in: 1 } },
    ],
    compute(v, unit) {
      const body = num(v, 'body');
      const red = pct(v, 'reduction');
      if (body === null || red === null) return { empty: 'Give the body measurement.' };
      const r = elasticLength(body, red, num(v, 'overlap') ?? 0);
      if (!r) return { empty: 'Check the percentage.' };
      const kind = ELASTIC_KINDS.find((k) => k.id === str(v, 'kind'));
      return {
        headline: { label: 'Cut the elastic', value: formatLength(r.cut, unit), note: `${formatLength(r.finished, unit)} finished loop, ${formatPercent(red)} less than the body` },
        rows: [{ label: 'Quarter marks on the loop', value: [r.finished / 4, r.finished / 2, (3 * r.finished) / 4].map((m) => formatLength(m, unit)).join(' · ') }],
        notes: [kind?.note ?? '', 'Try the loop on before you sew it in: elastics vary, and so do waists.'].filter(Boolean),
      };
    },
  },
  {
    id: 'bands',
    name: 'Knit bands',
    blurb: 'Neckbands, cuffs and hem bands cut shorter than the opening so they lie flat.',
    fields: [
      { key: 'kind', kind: 'select', label: 'Band', default: 'neck', options: BAND_KINDS.map((k) => ({ value: k.id, label: k.name })), sets: (id) => ({ ratio: (BAND_KINDS.find((k) => k.id === id)?.ratio ?? 0.85) * 100 }) },
      { key: 'opening', kind: 'length', label: 'Opening', default: { cm: 50, in: 20 }, hint: 'Measured on the seam line all the way round, seams sewn.' },
      { key: 'ratio', kind: 'percent', label: 'Band length', default: 85, hint: 'Of the opening. Rib and very stretchy knits can go lower.' },
      { key: 'finished', kind: 'length', label: 'Finished band width', default: { cm: 2, in: 0.75 } },
      { key: 'sa', kind: 'length', label: 'Seam allowance', default: { cm: 0.75, in: 0.375 } },
    ],
    compute(v, unit) {
      const opening = num(v, 'opening');
      const ratio = pct(v, 'ratio');
      if (opening === null || ratio === null) return { empty: 'Give the opening and a percentage.' };
      const r = knitBand(opening, ratio, num(v, 'finished') ?? 0, num(v, 'sa') ?? 0);
      if (!r) return { empty: 'Check the numbers.' };
      const L = (cm: number) => formatLength(cm, unit);
      return {
        headline: { label: 'Cut the band', value: `${L(r.cutLength)} × ${L(r.cutWidth)}`, note: 'Length along the stretch, width folded double' },
        rows: [{ label: 'Quarter marks from the seam', value: r.quarterMarks.slice(1).map(L).join(' · '), sub: 'Quarter the opening too and match the marks; stretch the band to fit between pins.' }],
        notes: ['Cut the band with the greatest stretch running along its length. If it stands away from the body, cut it shorter; if it puckers, longer.'],
      };
    },
  },
  {
    id: 'pleats',
    name: 'Pleats',
    blurb: 'Fabric for a run of knife, box or inverted pleats, and where to chalk the fold and placement lines.',
    fields: [
      { key: 'style', kind: 'select', label: 'Pleat', default: 'knife', options: [{ value: 'knife', label: 'Knife' }, { value: 'box', label: 'Box' }, { value: 'inverted', label: 'Inverted box' }] },
      { key: 'finished', kind: 'length', label: 'Finished width', default: { cm: 60, in: 24 }, hint: 'The pleated section once sewn.' },
      { key: 'pleat', kind: 'length', label: 'Pleat width', default: { cm: 5, in: 2 }, hint: 'The face of each pleat.' },
      { key: 'depth', kind: 'length', label: 'Pleat depth', default: { cm: 5, in: 2 }, hint: 'The fold tucked behind. Equal to the width for a full 1:3 pleat.' },
      { key: 'end', kind: 'length', label: 'Allowance at each end', default: SA },
    ],
    compute(v, unit) {
      const finished = num(v, 'finished');
      const pleat = num(v, 'pleat');
      if (finished === null || pleat === null) return { empty: 'Give the finished width and the pleat width.' };
      const r = pleats({ style: str(v, 'style') as PleatStyle, finishedWidth: finished, pleatWidth: pleat, depth: num(v, 'depth') ?? 0, endAllowance: num(v, 'end') ?? 0 });
      if (!r) return { empty: 'Check the numbers.' };
      const L = (cm: number) => formatLength(cm, unit);
      return {
        headline: { label: 'Cut width', value: formatLength(r.cutWidth, unit, { long: true }), note: `${r.count} pleats, ${r.ratio.toFixed(1).replace(/\.0$/, '')}× the finished width, end allowances included` },
        table: { head: ['Mark from the left', 'Line'], numeric: [true, false], rows: r.marks.map((m) => [{ text: L(m.position) }, { text: m.kind === 'fold' ? 'Fold' : 'Placement', cls: m.kind === 'fold' ? 'kind-fold' : '' }]) },
        notes: ['Bring each fold line to the next placement line and pin. Baste across the top before the waistband goes on.', 'Chalk the lines on the wrong side and snip the top edge at each mark.'],
      };
    },
  },
  {
    id: 'width',
    name: 'Fabric width',
    blurb: 'The pattern asks for a length at one width and the bolt is another. Rounded up to the next 10 cm or eighth of a yard.',
    fields: [
      { key: 'length', kind: 'length', long: true, label: 'Length the pattern asks for', default: { cm: 200, in: 80 } },
      { key: 'from', kind: 'length', label: 'At this width', default: WIDTH_NARROW },
      { key: 'to', kind: 'length', label: 'Your fabric is', default: WIDTH },
    ],
    compute(v, unit) {
      const length = num(v, 'length');
      const from = num(v, 'from');
      const to = num(v, 'to');
      if (length === null || from === null || to === null) return { empty: 'Give all three lengths.' };
      const r = convertWidth(length, from, to, unit);
      if (r === null) return { empty: 'Check the numbers.' };
      const chart = widthChart(length, from, unit);
      return {
        headline: { label: `Buy, at ${formatLength(to, unit)} wide`, value: formatBuy(r, unit), note: `for ${formatBuy(length, unit)} at ${formatLength(from, unit)}` },
        table: { head: ['Width', 'Length'], numeric: [true, true], rows: chart.map((c) => [{ text: formatLength(c.width, unit) }, { text: formatBuy(c.length, unit) }]) },
        notes: ['This keeps the area the same, which is what the charts on pattern envelopes do. A piece wider than the narrower fabric (a circle skirt, a wide sleeve) will not fit however long you buy: check with a layout.', 'Napped and one-way prints need more: add a pattern repeat or a quarter.'],
      };
    },
  },
  {
    id: 'shrink',
    name: 'Shrinkage',
    blurb: 'Measure a swatch before and after washing, then buy enough that what is left after pre-washing still covers the pattern.',
    fields: [
      { key: 'lenBefore', kind: 'length', label: 'Swatch length before', default: { cm: 20, in: 8 }, hint: 'Along the grain.' },
      { key: 'lenAfter', kind: 'length', label: 'Swatch length after', default: { cm: 19.2, in: 7.75 } },
      { key: 'widBefore', kind: 'length', label: 'Swatch width before', default: { cm: 20, in: 8 }, hint: 'Across the grain.' },
      { key: 'widAfter', kind: 'length', label: 'Swatch width after', default: { cm: 19.8, in: 7.875 } },
      { key: 'needed', kind: 'length', long: true, label: 'Length the pattern needs', default: { cm: 200, in: 80 } },
      { key: 'width', kind: 'length', label: 'Fabric width', default: WIDTH },
    ],
    compute(v, unit) {
      const sl = shrinkage(num(v, 'lenBefore') ?? 0, num(v, 'lenAfter') ?? 0);
      const sw = shrinkage(num(v, 'widBefore') ?? 0, num(v, 'widAfter') ?? 0);
      const needed = num(v, 'needed');
      if (sl === null || sw === null) return { empty: 'Measure the swatch before and after.' };
      const out: Output = {
        rows: [
          { label: 'Shrinkage along the grain', value: formatPercent(sl, 1) },
          { label: 'Shrinkage across the grain', value: formatPercent(sw, 1) },
        ],
        notes: ['Mark the swatch with a square of thread 20 cm (8 in) each way, wash and dry it the way you will treat the garment, then measure again. Cut the swatch on grain or the numbers mix.'],
      };
      if (needed !== null) {
        const r = lengthToBuy(needed, sl, num(v, 'width') ?? 0, sw, unit);
        if (r) {
          out.headline = { label: 'Buy', value: formatBuy(r.buy, unit), note: `so ${formatBuy(needed, unit)} is left after washing` };
          if (num(v, 'width')) out.rows!.push({ label: 'Width after washing', value: formatLength(r.widthAfter, unit), sub: 'Check the pattern still fits across it.' });
        }
      }
      if (sl < 0 || sw < 0) out.warn = 'The swatch grew. Knits can relax; measure again once it has rested flat.';
      return out;
    },
  },
  {
    id: 'stretch',
    name: 'Stretch and ease',
    blurb: 'Stretch percentage from a marked fold, what that fabric suits, and negative ease both ways.',
    fields: [
      { key: 'marked', kind: 'length', label: 'Marked on the fold', default: { cm: 10, in: 4 }, hint: 'Fold the fabric across the greatest stretch and mark this much.' },
      { key: 'stretched', kind: 'length', label: 'Stretched to', default: { cm: 15, in: 6 }, hint: 'Stretched comfortably, not to its limit.' },
      { key: 'needs', kind: 'percent', label: 'The pattern needs', default: 50, hint: 'Optional: the stretch the pattern asks for.' },
      { key: 'body', kind: 'length', label: 'Body measurement', default: { cm: 90, in: 36 } },
      { key: 'ease', kind: 'percent', label: 'Negative ease', default: 10 },
      { key: 'finished', kind: 'length', label: 'Finished garment measurement', default: null, hint: 'Optional: the pattern’s finished measurement, to see its ease on you.' },
    ],
    compute(v, unit) {
      const marked = num(v, 'marked');
      const stretched = num(v, 'stretched');
      const out: Output = { rows: [], notes: [] };
      if (marked !== null && stretched !== null) {
        const s = stretchPercent(marked, stretched);
        if (s !== null) {
          const band = stretchBand(s);
          out.headline = { label: 'Stretch', value: formatPercent(s), note: `${band.name}: ${band.fabrics}` };
          const needs = pct(v, 'needs');
          if (needs !== null && needs > 0) {
            if (s + 1e-9 >= needs) out.rows!.push({ label: `Pattern needs ${formatPercent(needs)}`, value: 'Enough stretch' });
            else out.warn = `The pattern needs ${formatPercent(needs)} stretch and this fabric has ${formatPercent(s)}. Size up, or choose a stretchier fabric.`;
          }
        }
      }
      const body = num(v, 'body');
      const ease = pct(v, 'ease');
      if (body !== null && ease !== null) {
        const f = withNegativeEase(body, ease);
        if (f !== null) out.rows!.push({ label: `${formatLength(body, unit)} with ${formatPercent(ease)} negative ease`, value: formatLength(f, unit), sub: 'The finished garment measurement to aim for.' });
      }
      const finished = num(v, 'finished');
      if (body !== null && finished !== null) {
        const e = easeFromFinished(body, finished);
        if (e !== null) out.rows!.push({ label: `A ${formatLength(finished, unit)} finished garment on ${formatLength(body, unit)}`, value: e >= 0 ? `${formatPercent(e, 1)} negative ease` : `${formatPercent(-e, 1)} positive ease` });
      }
      out.notes!.push('Negative ease needs recovery as well as stretch: if the fabric stays stretched when you let go, it will bag.');
      if (!out.headline && !out.rows!.length) return { empty: 'Mark a fold and stretch it.' };
      return out;
    },
  },
  {
    id: 'allowance',
    name: 'Seam allowances',
    blurb: 'What to trim or add when you sew at a different allowance from the pattern, and the finished measurement of a pattern piece measured flat.',
    fields: [
      { key: 'pattern', kind: 'length', label: 'The pattern’s allowance', default: SA },
      { key: 'sewing', kind: 'length', label: 'You sew at', default: SA_NARROW },
      { key: 'measured', kind: 'length', label: 'Piece measured flat', default: { cm: 25, in: 10 }, hint: 'Edge to edge at the bust, waist or hip line, skipping darts and pleats.' },
      { key: 'allowances', kind: 'int', label: 'Allowances in that measurement', default: 1, hint: '1 for a piece on the fold, 2 for a piece with a seam each side.' },
      { key: 'times', kind: 'number', label: 'Times round the body', default: 4, suffix: '×', hint: '4 for a half front; 2 for a full front, or a half front plus a matching back.' },
      { key: 'body', kind: 'length', label: 'Body measurement', default: null, hint: 'Optional, to see the ease.' },
    ],
    compute(v, unit) {
      const pattern = num(v, 'pattern');
      const sewing = num(v, 'sewing');
      const L = (cm: number) => formatLength(cm, unit);
      const out: Output = { rows: [], notes: [] };
      if (pattern !== null && sewing !== null) {
        const c = allowanceChange(pattern, sewing);
        if (c) {
          const d = Math.abs(c.change);
          out.headline = d < 1e-9
            ? { label: 'Allowances match', value: L(sewing), note: 'Nothing to trim or add.' }
            : c.change < 0
              ? { label: 'Trim off every edge', value: L(d), note: `The pattern has ${L(pattern)}; you sew at ${L(sewing)}. Or leave the piece and sew ${L(d)} further in.` }
              : { label: 'Add to every edge', value: L(d), note: `The pattern has ${L(pattern)}; you sew at ${L(sewing)}.` };
        }
      }
      const measured = num(v, 'measured');
      if (measured !== null && pattern !== null) {
        const r = finishedFromFlat(measured, pattern, num(v, 'allowances') ?? 0, num(v, 'times') ?? 1, num(v, 'body'));
        if (r) {
          out.rows!.push({ label: 'Finished garment measurement', value: L(r.finished), sub: 'Allowances taken off, then times round the body.' });
          if (r.ease !== null) out.rows!.push({ label: r.ease >= 0 ? 'Ease' : 'Negative ease', value: L(Math.abs(r.ease)) });
        } else out.warn = 'The allowances are more than the measurement.';
      }
      out.notes!.push('Hems and foldlines carry no seam allowance in the count: a piece on the fold crosses one allowance, not two.');
      if (!out.headline && !out.rows!.length) return { empty: 'Give the two allowances.' };
      return out;
    },
  },
  {
    id: 'thread',
    name: 'Thread',
    blurb: 'How much thread the seams of a project use, by stitch, and whether the spool will last.',
    fields: [
      { key: 'seams', kind: 'length', long: true, label: 'Seams to sew', default: { cm: 1000, in: 11 * 36 }, hint: TYPICAL_SEAMS.map((t) => `${t.name} ${t.length / 100} m`).join(', ') + '.' },
      { key: 'stitch', kind: 'select', label: 'Stitch', default: 'lock', options: STITCH_KINDS.map((k) => ({ value: k.id, label: k.name })), sets: (id) => ({ spool: id === 'lock' || id === 'zigzag' ? 100000 : 250000 }), hint: 'Changing the stitch resets the spool to a 1000 m reel or a 2500 m cone.' },
      { key: 'waste', kind: 'percent', label: 'Add for tails and unpicking', default: 15 },
      { key: 'spool', kind: 'length', long: true, label: 'Thread on a spool', default: { cm: 100000, in: 1094 * 36 }, hint: 'Sew-all spools are 100 m, 250 m or 1000 m; overlocker cones 2500 m or 3000 m.' },
    ],
    compute(v, unit) {
      const seams = num(v, 'seams');
      const kind = STITCH_KINDS.find((k) => k.id === str(v, 'stitch')) ?? STITCH_KINDS[0]!;
      const waste = pct(v, 'waste') ?? 0;
      if (seams === null) return { empty: 'Give the length of the seams.' };
      const r = threadNeeded(seams, kind, waste, num(v, 'spool') ?? 0);
      if (!r) return { empty: 'Check the numbers.' };
      const L = (cm: number) => formatLength(cm, unit, { long: true });
      return {
        headline: { label: 'Thread, all threads together', value: L(r.total), note: `${kind.ratio}× the seam length${waste ? `, plus ${formatPercent(waste)}` : ''}` },
        table: { head: ['Thread', 'Length', 'Spools'], numeric: [false, true, true], rows: r.perThread.map((p) => [{ text: p.name }, { text: L(p.length) }, { text: p.spools ? `${p.spools}` : '–' }]) },
        notes: ['Thread-maker ratios for medium fabric at an ordinary stitch length. Thick seams, short stitches and wide overlock stitches use more; the spool to watch is the looper.'],
      };
    },
  },
  {
    id: 'needles',
    name: 'Needle and thread',
    blurb: 'A starting needle, thread, stitch and overlocker setting for the fabric on the table. Test on a scrap of the same layers.',
    fields: [{ key: 'q', kind: 'text', label: 'Fabric', default: '', placeholder: 'ponte, chiffon, denim, swim…', wide: true }],
    compute(v) {
      const hits = searchNeedles(str(v, 'q'));
      if (!hits.length) return { empty: 'Nothing matches. Try the fabric’s type (knit, woven, sheer) instead of its name.' };
      return {
        cards: hits.map((e) => ({ title: e.fabric, subtitle: e.examples, pairs: [['Needle', `${e.needle} ${e.size}`], ['Thread', e.thread], ['Stitch', e.stitch], ['Overlocker', e.overlock]], tip: e.tip })),
        notes: ['Needle sizes are European/American: 80/12. Change the needle every project or eight hours of sewing; a dull one skips and snags before it breaks.'],
      };
    },
  },
];
