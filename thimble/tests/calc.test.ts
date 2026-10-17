import { describe, expect, it } from 'vitest';
import { biasFromPiece, bindingNeeded, squareForBias, stripWidthFor } from '../src/calc/bias';
import { circleSkirt } from '../src/calc/circle';
import { finishedFromStrip, ruffle } from '../src/calc/gathers';
import { buttonholeLength, placeButtons } from '../src/calc/buttons';
import { ELASTIC_KINDS, elasticLength, knitBand } from '../src/calc/elastic';
import { pleats } from '../src/calc/pleats';
import { convertWidth, widthChart } from '../src/calc/width';
import { lengthToBuy, shrinkage } from '../src/calc/shrinkage';
import { easeFromFinished, stretchBand, stretchPercent, withNegativeEase } from '../src/calc/stretch';
import { searchNeedles } from '../src/calc/needles';

describe('bias', () => {
  it('a 45 cm square gives roughly 7 m of 2.5 cm bias', () => {
    const r = biasFromPiece(45, 45, 2.5)!;
    // (45² − 2.5²) / 2.5 × 0.9 ≈ 727 cm
    expect(r.length).toBeCloseTo(726.75, 1);
    expect(r.strips).toBe(25);
  });
  it('the reverse gives the square back', () => {
    const r = biasFromPiece(45, 45, 2.5)!;
    expect(squareForBias(r.length, 2.5)!).toBeCloseTo(45, 6);
  });
  it('a piece smaller than a strip gives nothing', () => {
    expect(biasFromPiece(2, 2, 2.5)!.length).toBe(0);
    expect(biasFromPiece(0, 2, 2.5)).toBeNull();
  });
  it('binding and strip widths', () => {
    expect(bindingNeeded(200)).toBe(225);
    expect(stripWidthFor(1.2, 'double')).toBeCloseTo(4.8);
    expect(stripWidthFor(1.2, 'single')).toBeCloseTo(2.4);
    expect(stripWidthFor(1.2, 'double', true)).toBeCloseTo(5.1);
  });
});

describe('circle skirt', () => {
  const base = { waist: 76, ease: 2, length: 60, waistAllowance: 1, hemAllowance: 1.5, seamAllowance: 1.5, fabricWidth: 150 };
  it('full circle radius is the waist over 2π', () => {
    const r = circleSkirt({ ...base, fraction: 1 })!;
    expect(r.waistRadius).toBeCloseTo(78 / (2 * Math.PI), 4);
    expect(r.waistCutRadius).toBeCloseTo(r.waistRadius - 1, 6);
    expect(r.outerRadius).toBeCloseTo(r.waistRadius + 61.5, 6);
    expect(r.hemLength).toBeCloseTo(2 * Math.PI * (r.waistRadius + 60), 4);
  });
  it('a full circle on wide fabric is one piece 2R long', () => {
    const r = circleSkirt({ ...base, fraction: 1 })!;
    expect(r.onePiece).toBe(true);
    expect(r.fabricLength).toBeCloseTo(2 * r.outerRadius, 6);
  });
  it('a full circle on narrow fabric is four panels', () => {
    const r = circleSkirt({ ...base, fraction: 1, fabricWidth: 110 })!;
    expect(r.onePiece).toBe(false);
    expect(r.panels).toBe(4);
    expect(r.across).toBe(1);
    expect(r.fabricLength).toBeCloseTo(4 * (r.outerRadius + 1.5), 6);
  });
  it('a half circle doubles the radius and a quarter quadruples it', () => {
    const full = circleSkirt({ ...base, fraction: 1 })!;
    const half = circleSkirt({ ...base, fraction: 0.5 })!;
    const quarter = circleSkirt({ ...base, fraction: 0.25 })!;
    expect(half.waistRadius).toBeCloseTo(2 * full.waistRadius, 6);
    expect(quarter.waistRadius).toBeCloseTo(4 * full.waistRadius, 6);
    expect(quarter.panels).toBe(1);
  });
  it('says when a panel is wider than the fabric', () => {
    const r = circleSkirt({ ...base, fraction: 0.25, length: 120, fabricWidth: 110 })!;
    expect(r.fabricLength).toBeNull();
  });
});

describe('gathers', () => {
  it('strips across the width and fabric to cut', () => {
    const r = ruffle({ finishedLength: 200, ratio: 2, finishedDepth: 10, hem: 1, doubleFoldHem: true, seamAllowance: 1, fabricWidth: 150 })!;
    expect(r.cutLength).toBe(400);
    expect(r.cutDepth).toBe(13);
    expect(r.strips).toBe(3); // 400 / 148
    expect(r.fabricLength).toBe(39);
  });
  it('reverse', () => {
    expect(finishedFromStrip(300, 2.5)).toBe(120);
  });
});

describe('buttons', () => {
  it('spaces by count', () => {
    const r = placeButtons({ mode: 'count', length: 60, count: 7, top: 1.5, bottom: 7.5 })!;
    expect(r.spacing).toBeCloseTo(8.5);
    expect(r.positions[0]).toBe(1.5);
    expect(r.positions[6]).toBeCloseTo(52.5);
    expect(r.positions).toHaveLength(7);
  });
  it('a single button sits in the middle', () => {
    expect(placeButtons({ mode: 'count', length: 10, count: 1, top: 0, bottom: 0 })!.positions).toEqual([5]);
  });
  it('spaces by spacing', () => {
    const r = placeButtons({ mode: 'spacing', length: 60, spacing: 8, top: 2, bottom: 2 })!;
    expect(r.positions).toEqual([2, 10, 18, 26, 34, 42, 50, 58]);
  });
  it('steps out from an anchor', () => {
    const r = placeButtons({ mode: 'anchor', length: 60, spacing: 8, anchor: 25, top: 2, bottom: 2 })!;
    expect(r.positions).toEqual([9, 17, 25, 33, 41, 49, 57]);
  });
  it('rejects a span that does not fit', () => {
    expect(placeButtons({ mode: 'count', length: 10, count: 3, top: 6, bottom: 6 })).toBeNull();
    expect(placeButtons({ mode: 'anchor', length: 60, spacing: 8, anchor: 1, top: 2, bottom: 2 })).toBeNull();
  });
  it('buttonhole lengths', () => {
    expect(buttonholeLength(2, 0.3, 'flat')).toBeCloseTo(2.6);
    expect(buttonholeLength(2, 0.3, 'ball')).toBeCloseTo(Math.PI + 0.3);
  });
});

describe('elastic and bands', () => {
  it('takes the reduction off and adds the overlap', () => {
    const r = elasticLength(80, 0.08, 2.5)!;
    expect(r.finished).toBeCloseTo(73.6);
    expect(r.cut).toBeCloseTo(76.1);
  });
  it('every elastic kind has a sane reduction', () => {
    for (const k of ELASTIC_KINDS) expect(k.reduction).toBeGreaterThanOrEqual(0), expect(k.reduction).toBeLessThan(0.5);
  });
  it('a neckband at 85 percent', () => {
    const r = knitBand(50, 0.85, 2, 0.75)!;
    expect(r.cutLength).toBeCloseTo(44);
    expect(r.cutWidth).toBeCloseTo(5.5);
    expect(r.quarterMarks[2]).toBeCloseTo(21.25);
  });
});

describe('pleats', () => {
  it('knife pleats with depth equal to width use three times the fabric', () => {
    const r = pleats({ style: 'knife', finishedWidth: 60, pleatWidth: 5, depth: 5, endAllowance: 1.5 })!;
    expect(r.count).toBe(12);
    expect(r.pleated).toBe(180);
    expect(r.cutWidth).toBe(183);
    expect(r.ratio).toBe(3);
    expect(r.marks[0]).toEqual({ position: 6.5, kind: 'fold' });
    expect(r.marks[1]).toEqual({ position: 16.5, kind: 'placement' });
    expect(r.marks).toHaveLength(24);
    expect(r.marks[23]).toEqual({ position: 181.5, kind: 'placement' });
  });
  it('box pleats mark placement, fold, fold, placement', () => {
    const r = pleats({ style: 'box', finishedWidth: 20, pleatWidth: 10, depth: 4, endAllowance: 0 })!;
    expect(r.count).toBe(2);
    expect(r.pleated).toBe(36);
    expect(r.marks.map((m) => m.kind)).toEqual(['placement', 'fold', 'fold', 'placement', 'placement', 'fold', 'fold', 'placement']);
    expect(r.marks.map((m) => m.position)).toEqual([0, 4, 14, 18, 18, 22, 32, 36]);
  });
  it('inverted pleats mark fold, placement, placement, fold', () => {
    const r = pleats({ style: 'inverted', finishedWidth: 10, pleatWidth: 10, depth: 3, endAllowance: 0 })!;
    expect(r.marks.map((m) => m.kind)).toEqual(['fold', 'placement', 'fold']);
    expect(r.marks.map((m) => m.position)).toEqual([0, 3, 6]);
    expect(r.pleated).toBe(16);
    const two = pleats({ style: 'inverted', finishedWidth: 20, pleatWidth: 10, depth: 3, endAllowance: 0 })!;
    expect(two.marks.map((m) => m.position)).toEqual([0, 3, 6, 16, 19, 22]);
  });
});

describe('fabric width', () => {
  it('matches the envelope chart within an eighth of a yard', () => {
    const yd = 36 * 2.54;
    // 2 yd at 36" → 1 1/4 yd at 60"
    expect(convertWidth(2 * yd, 36 * 2.54, 60 * 2.54, 'in')! / yd).toBeCloseTo(1.25);
    // 2 1/2 yd at 36" → 1 3/4 yd at 54" (chart) : area says 1.67 → rounds up to 1 3/4
    expect(convertWidth(2.5 * yd, 36 * 2.54, 54 * 2.54, 'in')! / yd).toBeCloseTo(1.75);
  });
  it('rounds metres up to 10 cm', () => {
    expect(convertWidth(200, 115, 150, 'cm')).toBe(160); // 153.3 → 160
    expect(widthChart(200, 115, 'cm').map((r) => r.length)).toEqual([260, 210, 200, 170, 160, 150]);
  });
});

describe('shrinkage', () => {
  it('from a swatch', () => {
    expect(shrinkage(20, 19)).toBeCloseTo(0.05);
    expect(shrinkage(0, 19)).toBeNull();
  });
  it('buy enough to cover the shrink', () => {
    const r = lengthToBuy(200, 0.05, 150, 0.02, 'cm')!;
    expect(r.buy).toBe(220); // 210.5 → 220
    expect(r.widthAfter).toBe(147);
  });
});

describe('stretch', () => {
  it('percent from a stretched mark', () => {
    expect(stretchPercent(10, 15)).toBeCloseTo(0.5);
    expect(stretchBand(0.5).name).toBe('Stretchy');
    expect(stretchBand(0.1).name).toBe('Stable knit');
    expect(stretchBand(1).name).toBe('Very stretchy');
  });
  it('negative ease both ways', () => {
    expect(withNegativeEase(90, 0.1)).toBeCloseTo(81);
    expect(easeFromFinished(90, 81)).toBeCloseTo(0.1);
  });
});

describe('needles', () => {
  it('finds by fabric name and keyword', () => {
    expect(searchNeedles('').length).toBeGreaterThan(10);
    expect(searchNeedles('ponte')[0]!.fabric).toBe('Medium knits');
    expect(searchNeedles('swim').map((e) => e.fabric)).toContain('Swimwear and activewear');
    expect(searchNeedles('xyzzy')).toEqual([]);
  });
});
