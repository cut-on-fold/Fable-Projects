// Buying and fitting calculators added in v0.3.0.

import { gsmFromSample, gsmToOz, lengthFromWeight, ozToGsm, weightClass, weightOfLength } from './calc/weight';
import { SOLD_PER, pricePerSquareMetre, priceFor } from './calc/price';
import { waistband } from './calc/waistband';
import { EASE_RANGES, sleeveCap } from './calc/sleeve';
import { DRAFTED_FOR, bustAdjustment, cupSize } from './calc/bust';
import { parsePieces, yardage } from './calc/yardage';
import { searchPressing } from './calc/pressing';
import { searchFinishes } from './calc/finishes';
import { searchBurn } from './calc/burn';
import { CM_PER_IN, formatBuy, formatLength, formatPercent, fromUnit } from './units';
import { SA, WIDTH, bool, num, pct, str, type Output, type Tool, type Values } from './framework';

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const grams = (v: Values, key: string, unitKey: string): number | null => {
  const n = num(v, key);
  if (n === null) return null;
  return str(v, unitKey) === 'oz' ? n * 28.3495 : n;
};

export const MORE_TOOLS: Tool[] = [
  {
    id: 'weigh',
    name: 'Weigh fabric',
    group: 'Buying',
    blurb: 'Put the fabric on the kitchen scales and get the length that is left. Also gsm to oz/yd² and what that weight suits.',
    fields: [
      { key: 'know', kind: 'select', label: 'Fabric weight known as', default: 'gsm', options: [{ value: 'gsm', label: 'Grams per square metre (gsm)' }, { value: 'oz', label: 'Ounces per square yard' }, { value: 'sample', label: 'Not known: weigh a sample' }], wide: true },
      { key: 'gsm', kind: 'number', label: 'Weight', default: 200, suffix: 'gsm', showIf: (v) => v.know === 'gsm' },
      { key: 'oz', kind: 'number', label: 'Weight', default: 6, suffix: 'oz/yd²', showIf: (v) => v.know === 'oz' },
      { key: 'sampleW', kind: 'length', label: 'Sample width', default: { cm: 10, in: 4 }, showIf: (v) => v.know === 'sample' },
      { key: 'sampleH', kind: 'length', label: 'Sample height', default: { cm: 10, in: 4 }, showIf: (v) => v.know === 'sample' },
      { key: 'sampleG', kind: 'number', label: 'Sample weighs', default: 2, suffix: 'g', showIf: (v) => v.know === 'sample', hint: 'Cut it on grain and weigh it on scales that read tenths of a gram.' },
      { key: 'width', kind: 'length', label: 'Fabric width', default: WIDTH },
      { key: 'pieceWeight', kind: 'number', label: 'The piece weighs', default: 450, hint: 'The whole folded piece, nothing else on the scales.' },
      { key: 'weightUnit', kind: 'select', label: 'In', default: 'g', options: [{ value: 'g', label: 'grams' }, { value: 'oz', label: 'ounces' }] },
    ],
    compute(v, unit) {
      const know = str(v, 'know');
      let gsm: number | null = null;
      if (know === 'gsm') gsm = num(v, 'gsm');
      else if (know === 'oz') {
        const oz = num(v, 'oz');
        gsm = oz === null ? null : ozToGsm(oz);
      } else {
        const g = num(v, 'sampleG');
        const w = num(v, 'sampleW');
        const h = num(v, 'sampleH');
        gsm = g !== null && w !== null && h !== null ? gsmFromSample(g, w, h) : null;
      }
      if (gsm === null || !(gsm > 0)) return { empty: 'Give the fabric weight, or a sample to weigh.' };
      const cls = weightClass(gsm);
      const out: Output = {
        rows: [
          { label: 'Weight', value: `${Math.round(gsm)} gsm · ${gsmToOz(gsm).toFixed(1)} oz/yd²` },
          { label: cls.name, value: '', sub: cls.fabrics },
        ],
        notes: ['Shops quote gsm or oz/yd²; fabric weights on labels are often rounded, so expect the length to be within a few percent.'],
      };
      const width = num(v, 'width');
      const g = grams(v, 'pieceWeight', 'weightUnit');
      if (width !== null && g !== null) {
        const len = lengthFromWeight(g, gsm, width);
        if (len) out.headline = { label: 'Length of the piece', value: formatLength(len, unit, { long: true }), note: `${Math.round(g)} g of ${Math.round(gsm)} gsm at ${formatLength(width, unit)} wide` };
      }
      if (width !== null) {
        const one = weightOfLength(unit === 'in' ? 36 * CM_PER_IN : 100, gsm, width);
        if (one) out.rows!.push({ label: unit === 'in' ? 'One yard weighs' : 'One metre weighs', value: `${Math.round(one)} g` });
      }
      return out;
    },
  },
  {
    id: 'price',
    name: 'Price compare',
    group: 'Buying',
    blurb: 'Two fabrics sold by the metre, yard or fat quarter at different widths, compared by the square metre and by what your project would cost.',
    fields: [
      { key: 'priceA', kind: 'number', label: 'Fabric A: price', default: 18 },
      { key: 'perA', kind: 'select', label: 'Sold per', default: 'm', options: SOLD_PER.map((s) => ({ value: s.id, label: s.name })) },
      { key: 'widthA', kind: 'length', label: 'Fabric A: width', default: WIDTH },
      { key: 'priceB', kind: 'number', label: 'Fabric B: price', default: 14 },
      { key: 'perB', kind: 'select', label: 'Sold per', default: 'm', options: SOLD_PER.map((s) => ({ value: s.id, label: s.name })) },
      { key: 'widthB', kind: 'length', label: 'Fabric B: width', default: { cm: 112, in: 44 } },
      { key: 'needLength', kind: 'length', label: 'Project needs', default: { cm: 200, in: 2 * 36 }, long: true, hint: 'Optional: a length at the width below, to cost the project on each.' },
      { key: 'needWidth', kind: 'length', label: 'At a width of', default: WIDTH },
    ],
    compute(v, unit) {
      const a = { price: num(v, 'priceA') ?? NaN, per: str(v, 'perA'), width: num(v, 'widthA') ?? 0 };
      const b = { price: num(v, 'priceB') ?? NaN, per: str(v, 'perB'), width: num(v, 'widthB') ?? 0 };
      const pa = pricePerSquareMetre(a);
      const pb = pricePerSquareMetre(b);
      if (pa === null || pb === null) return { empty: 'Give a price and width for both fabrics.' };
      const perUnit = unit === 'in' ? 'square yard' : 'square metre';
      const scale = unit === 'in' ? 0.836127 : 1;
      const cheaper = pa === pb ? null : pa < pb ? 'A' : 'B';
      const diff = pa === pb ? 0 : Math.abs(pa - pb) / Math.max(pa, pb);
      const out: Output = {
        headline: cheaper
          ? { label: 'Cheaper by area', value: `Fabric ${cheaper}`, note: `${formatPercent(diff)} less per ${perUnit}` }
          : { label: 'Same price by area', value: money(pa * scale), note: `per ${perUnit}` },
        rows: [
          { label: `Fabric A per ${perUnit}`, value: money(pa * scale) },
          { label: `Fabric B per ${perUnit}`, value: money(pb * scale) },
        ],
        notes: ['Width matters as much as price: 150 cm fabric gives a third more than 112 cm for the same length. Wide fabric also wastes less on big pieces.'],
      };
      const nl = num(v, 'needLength');
      const nw = num(v, 'needWidth');
      if (nl !== null && nw !== null && nl > 0 && nw > 0) {
        out.rows!.push({ label: `Project on fabric A`, value: money(priceFor(pa, nl, nw)), sub: `Fabric for ${formatBuy(nl, unit)} at ${formatLength(nw, unit)}, bought at A’s width.` });
        out.rows!.push({ label: `Project on fabric B`, value: money(priceFor(pb, nl, nw)) });
      }
      return out;
    },
  },
  {
    id: 'waistband',
    name: 'Waistbands and cuffs',
    group: 'Cutting',
    blurb: 'Cut length and width for a straight woven waistband or cuff, the interfacing, and where the seams fall along it.',
    fields: [
      { key: 'band', kind: 'select', label: 'Band', default: 'waist', options: [{ value: 'waist', label: 'Waistband' }, { value: 'cuff', label: 'Cuff' }, { value: 'plain', label: 'Band that meets edge to edge' }], sets: (id, unit): Values => (id === 'waist' ? { underlap: fromUnit(unit === 'in' ? 1.25 : 3, unit), finishedWidth: fromUnit(unit === 'in' ? 1.5 : 4, unit) } : id === 'cuff' ? { underlap: fromUnit(unit === 'in' ? 1 : 2.5, unit), finishedWidth: fromUnit(unit === 'in' ? 2.5 : 6, unit) } : { underlap: 0 }) },
      { key: 'body', kind: 'length', label: 'Waist or wrist', default: { cm: 80, in: 31.5 }, hint: 'Where the band sits, over any garment underneath.', person: 'Waist' },
      { key: 'ease', kind: 'length', label: 'Ease', default: { cm: 2, in: 0.75 } },
      { key: 'underlap', kind: 'length', label: 'Underlap for the button or hook', default: { cm: 3, in: 1.25 } },
      { key: 'finishedWidth', kind: 'length', label: 'Finished width', default: { cm: 4, in: 1.5 } },
      { key: 'sa', kind: 'length', label: 'Seam allowance', default: SA },
      { key: 'interfaceAll', kind: 'check', label: 'Interface both halves', default: false },
    ],
    compute(v, unit) {
      const body = num(v, 'body');
      const fw = num(v, 'finishedWidth');
      if (body === null || fw === null) return { empty: 'Give the measurement and the finished width.' };
      const r = waistband({ body, ease: num(v, 'ease') ?? 0, underlap: num(v, 'underlap') ?? 0, finishedWidth: fw, seamAllowance: num(v, 'sa') ?? 0, interfaceAll: bool(v, 'interfaceAll') });
      if (!r) return { empty: 'Check the numbers.' };
      const L = (cm: number) => formatLength(cm, unit);
      return {
        headline: { label: 'Cut the band', value: `${L(r.cutLength)} × ${L(r.cutWidth)}`, note: 'On the lengthwise grain, or across for stretch control; folded double' },
        rows: [
          { label: 'Interfacing', value: `${L(r.interfacingLength)} × ${L(r.interfacingWidth)}`, sub: bool(v, 'interfaceAll') ? 'The whole band.' : 'The outer half plus one seam allowance, fused to the wrong side of the outside.' },
          { label: 'Finished length', value: L(r.finishedLength) },
        ],
        table: { head: ['Mark', 'From the left end'], numeric: [false, true], rows: r.marks.map((m) => [{ text: m.name }, { text: L(m.position) }]) },
        notes: ['Fuse the interfacing before cutting the band: fusible shrinks a little. The marks sit on the seam line; the underlap goes beyond the last centre front.'],
      };
    },
  },
  {
    id: 'sleeve',
    name: 'Sleeve cap',
    group: 'Fitting',
    blurb: 'Measure the sleeve cap and the armscye on their seam lines and see whether the ease suits the fabric.',
    fields: [
      { key: 'cap', kind: 'length', label: 'Sleeve cap, seam line', default: { cm: 48, in: 19 }, hint: 'Notch to notch over the top, front and back together.' },
      { key: 'armscye', kind: 'length', label: 'Armscye, seam line', default: { cm: 45, in: 17.75 }, hint: 'Front and back bodice, underarm seam to underarm seam.' },
      { key: 'fabric', kind: 'select', label: 'Sleeve', default: 'woven', options: EASE_RANGES.map((r) => ({ value: r.id, label: r.name })), wide: true },
    ],
    compute(v, unit) {
      const cap = num(v, 'cap');
      const arm = num(v, 'armscye');
      const range = EASE_RANGES.find((r) => r.id === str(v, 'fabric')) ?? EASE_RANGES[0]!;
      if (cap === null || arm === null) return { empty: 'Measure both seam lines.' };
      const r = sleeveCap(cap, arm, range);
      if (!r) return { empty: 'Check the numbers.' };
      const L = (cm: number) => formatLength(cm, unit);
      const out: Output = {
        headline: { label: 'Cap ease', value: L(r.ease), note: `${range.name}: ${L(range.min)} to ${L(range.max)} suits it` },
        rows: [],
        notes: [range.note, 'Walk the seam lines with the pattern on edge, or measure with a tape stood on its side; ignore the seam allowances.'],
      };
      if (r.verdict === 'high') {
        out.warn = `Too much ease: take about ${L(-r.change)} out of the cap.`;
        out.rows!.push({ label: 'How', value: '', sub: `Lower the cap by about ${L(-r.change / 2)} and redraw the curve, or fold a tuck across the cap. Check the bicep stays the same.` });
      } else if (r.verdict === 'low') {
        out.warn = `Not enough ease: add about ${L(r.change)} to the cap.`;
        out.rows!.push({ label: 'How', value: '', sub: `Raise the cap by about ${L(r.change / 2)} and redraw the curve.` });
      } else out.rows!.push({ label: 'Within the range', value: 'Sew it' });
      return out;
    },
  },
  {
    id: 'bust',
    name: 'Cup size and FBA',
    group: 'Fitting',
    blurb: 'Sewing cup size from the high bust and full bust, which size to cut, and how much full or small bust adjustment the pattern needs.',
    fields: [
      { key: 'high', kind: 'length', label: 'High bust', default: { cm: 90, in: 35.5 }, hint: 'Under the arms, above the bust, tape snug.', person: 'High bust' },
      { key: 'full', kind: 'length', label: 'Full bust', default: { cm: 100, in: 39.5 }, hint: 'Over the fullest part, wearing the bra you will wear with it.', person: 'Full bust / chest' },
      { key: 'drafted', kind: 'select', label: 'The pattern is drafted for a', default: 'B', options: DRAFTED_FOR.map((d) => ({ value: d.id, label: d.name })), wide: true, hint: 'Most patterns draft for a B cup. Cup-sized ranges say which cup each piece is.' },
    ],
    compute(v, unit) {
      const high = num(v, 'high');
      const full = num(v, 'full');
      if (high === null || full === null) return { empty: 'Give both measurements.' };
      const cup = cupSize(high, full);
      const drafted = DRAFTED_FOR.find((d) => d.id === str(v, 'drafted')) ?? DRAFTED_FOR[1]!;
      const adj = bustAdjustment(high, full, drafted.difference);
      if (!cup || !adj) return { empty: 'Check the numbers.' };
      const L = (cm: number) => formatLength(cm, unit);
      const out: Output = {
        headline: { label: 'Sewing cup', value: cup.cup, note: `${L(cup.difference)} between high bust and full bust` },
        rows: [{ label: 'Pick the size by full bust', value: L(adj.patternBust), sub: `Your high bust plus the ${drafted.name.split(' (')[0]} the pattern drafts for: this size fits the shoulders and chest.` }],
        notes: ['The cup here is the sewing cup from the difference alone; it is not a bra size.', 'An FBA adds length as well as width: check the side seam and hem after.'],
      };
      if (Math.abs(adj.perSide) < 0.3) out.rows!.push({ label: 'Bust adjustment', value: 'None needed' });
      else if (adj.perSide > 0) out.rows!.push({ label: 'Full bust adjustment', value: `${L(adj.perSide)} per side`, sub: `${L(adj.perSide * 2)} across the whole front, half on each side.` });
      else out.rows!.push({ label: 'Small bust adjustment', value: `${L(-adj.perSide)} per side`, sub: `${L(-adj.perSide * 2)} across the whole front.` });
      return out;
    },
  },
  {
    id: 'yardage',
    name: 'Yardage estimate',
    group: 'Buying',
    blurb: 'A quick fabric estimate from the sizes of the pieces, for a pattern with no envelope figure. Area plus waste, not a layout.',
    fields: [
      { key: 'pieces', kind: 'lines', label: 'Pieces, one a line: width × height × how many', default: 'front 60 × 80 × 1\nback 60 × 80 × 1\nsleeve 40 × 60 × 2\nfacing 30 × 10 × 2', placeholder: 'front 60 x 80 x1', wide: true, hint: 'The box round each piece, in the unit switched on. A piece cut on the fold is its full opened width.' },
      { key: 'width', kind: 'length', label: 'Fabric width', default: WIDTH },
      { key: 'waste', kind: 'percent', label: 'Waste', default: 20, hint: '15% for simple shapes, 25% for curves and many small pieces, more for a one-way print.' },
    ],
    compute(v, unit) {
      const parsed = parsePieces(str(v, 'pieces'), (n) => fromUnit(n, unit));
      const width = num(v, 'width');
      if (!parsed.pieces.length) return { empty: 'List the pieces, one a line, as width × height × count.' };
      if (width === null) return { empty: 'Give the fabric width.' };
      const r = yardage(parsed.pieces, width, pct(v, 'waste') ?? 0, unit);
      if (!r) return { empty: 'Check the numbers.' };
      const count = parsed.pieces.reduce((a, p) => a + p.count, 0);
      const out: Output = {
        headline: { label: 'Buy about', value: formatBuy(r.length, unit), note: `${count} pieces at ${formatLength(width, unit)} wide, with waste` },
        rows: [{ label: 'Area of the pieces', value: unit === 'in' ? `${(r.area / 8361.27).toFixed(2)} yd²` : `${(r.area / 10000).toFixed(2)} m²` }],
        notes: ['For the real figure, nest the pieces in Grain-Nest; this is for deciding how much to order.'],
      };
      if (!r.fits) out.warn = `The widest piece (${formatLength(r.widest, unit)}) is wider than the fabric.`;
      if (parsed.bad.length) out.rows!.push({ label: 'Could not read', value: parsed.bad.join('; ') });
      return out;
    },
  },
  {
    id: 'pressing',
    name: 'Pressing and interfacing',
    group: 'Reference',
    blurb: 'Iron setting, steam, press cloth and the interfacing to reach for, by fibre. On a blend, go by the most delicate fibre.',
    fields: [{ key: 'q', kind: 'text', label: 'Fibre or fabric', default: '', placeholder: 'silk, linen, ponte, polyester…', wide: true }],
    compute(v) {
      const hits = searchPressing(str(v, 'q'));
      if (!hits.length) return { empty: 'Nothing matches. Try the fibre (cotton, wool, polyester) rather than the fabric\u2019s name.' };
      return {
        cards: hits.map((e) => ({ title: e.fibre, subtitle: e.examples, pairs: [['Iron', e.iron], ['Steam', e.steam], ['Press cloth', e.cloth], ['Interfacing', e.interfacing]], tip: e.tip })),
        notes: ['Dots on the dial: • about 110 °C, •• about 150 °C, ••• about 200 °C. Fuse interfacing with a press cloth, a dry iron held still for 10–15 seconds, then steam; let it cool flat before moving it.'],
      };
    },
  },
  {
    id: 'finishes',
    name: 'Seam finishes',
    group: 'Reference',
    blurb: 'Which seam finish and hem suit the fabric.',
    fields: [{ key: 'q', kind: 'text', label: 'Fabric', default: '', placeholder: 'chiffon, linen, denim, jersey…', wide: true }],
    compute(v) {
      const hits = searchFinishes(str(v, 'q'));
      if (!hits.length) return { empty: 'Nothing matches. Try the fabric\u2019s type: sheer, light, medium, heavy, knit.' };
      return {
        cards: hits.map((e) => ({ title: e.fabric, subtitle: e.examples, pairs: [['Best', e.best], ['Also', e.also], ['Hem', e.hem]], tip: e.tip })),
        notes: ['A French seam needs 1.5 cm of allowance; a flat-felled seam 1.5–2 cm; an overlocked seam any width, trimmed by the knife.'],
      };
    },
  },
  {
    id: 'burn',
    name: 'Burn test',
    group: 'Reference',
    blurb: 'Name a mystery fabric from how a snippet burns. Type what you saw and smelt.',
    fields: [{ key: 'q', kind: 'text', label: 'What happened', default: '', placeholder: 'melts, hard bead, vinegar, burning hair, soft ash…', wide: true }],
    compute(v) {
      const hits = searchBurn(str(v, 'q'));
      if (!hits.length) return { empty: 'Nothing matches those words. Try one at a time: ash, bead, melts, hair, paper, sweet, vinegar, celery.' };
      return {
        cards: hits.map((e) => ({ title: e.fibre, subtitle: e.approach, pairs: [['Burning', e.burning], ['Smell', e.smell], ['Left behind', e.residue]], tip: e.fibre === 'A blend' ? 'Pull a thread from each direction and burn them separately: warp and weft can be different fibres.' : 'Snip a 2 cm piece, hold it in tweezers over the sink, and bring the flame to it from the side.' })),
        notes: ['Natural fibres leave ash; synthetics leave a bead. Cellulose smells of paper, protein of hair. Do this over a sink, with a lid to hand.'],
      };
    },
  },
  {
    id: 'people',
    name: 'People',
    group: 'People',
    blurb: 'Measurements for the people you sew for, so the calculators can fill their body fields from a name. Read from Stash\u2019s Measurements.csv or typed in; kept in this browser only.',
    fields: [],
    custom: true,
    compute: () => ({}),
  },
];
