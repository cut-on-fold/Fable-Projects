import { describe, expect, it } from 'vitest';
import { gsmFromSample, gsmToOz, lengthFromWeight, ozToGsm, weightClass, weightOfLength } from '../src/calc/weight';
import { priceFor, pricePerSquareMetre, unitArea } from '../src/calc/price';
import { waistband } from '../src/calc/waistband';
import { EASE_RANGES, sleeveCap } from '../src/calc/sleeve';
import { bustAdjustment, cupSize } from '../src/calc/bust';
import { convertPieces, parsePieces, yardage } from '../src/calc/yardage';

describe('weight', () => {
  it('converts gsm and oz', () => {
    expect(ozToGsm(10)).toBeCloseTo(339.06);
    expect(gsmToOz(339.06)).toBeCloseTo(10);
    expect(weightClass(120).name).toBe('Light');
    expect(weightClass(400).name).toBe('Heavy');
  });
  it('finds the length of a piece from its weight', () => {
    // 1.5 m of 200 gsm at 150 cm wide weighs 450 g
    expect(weightOfLength(150, 200, 150)).toBeCloseTo(450);
    expect(lengthFromWeight(450, 200, 150)).toBeCloseTo(150);
    expect(lengthFromWeight(0, 200, 150)).toBeNull();
  });
  it('gsm from a sample', () => {
    expect(gsmFromSample(2, 10, 10)).toBeCloseTo(200);
  });
});

describe('price', () => {
  it('areas of the units', () => {
    expect(unitArea('m', 150)).toBeCloseTo(1.5);
    expect(unitArea('yd', 112)).toBeCloseTo(1.0241);
    expect(unitArea('fq', 112)).toBeCloseTo(0.28);
    expect(unitArea('fq', 44 * 2.54, 'in')).toBeCloseTo(0.2555, 3);
    expect(unitArea('nope', 112)).toBeNull();
  });
  it('a dearer price per metre can be cheaper per square metre', () => {
    const wide = pricePerSquareMetre({ price: 18, per: 'm', width: 150 })!;
    const narrow = pricePerSquareMetre({ price: 14, per: 'm', width: 112 })!;
    expect(wide).toBeCloseTo(12);
    expect(narrow).toBeCloseTo(12.5);
    expect(priceFor(wide, 200, 150)).toBeCloseTo(36);
  });
});

describe('waistband', () => {
  it('cut sizes with an underlap', () => {
    const r = waistband({ body: 80, ease: 2, underlap: 3, finishedWidth: 4, seamAllowance: 1.5, interfaceAll: false })!;
    expect(r.finishedLength).toBe(85);
    expect(r.cutLength).toBe(88);
    expect(r.cutWidth).toBe(11);
    expect(r.interfacingWidth).toBe(5.5);
    expect(r.marks.map((m) => m.position)).toEqual([1.5, 22, 42.5, 63, 83.5, 86.5]);
  });
  it('no underlap, interfaced all over', () => {
    const r = waistband({ body: 16, ease: 1, underlap: 0, finishedWidth: 5, seamAllowance: 1, interfaceAll: true })!;
    expect(r.cutLength).toBe(19);
    expect(r.interfacingWidth).toBe(12);
    expect(r.marks).toHaveLength(5);
  });
});

describe('sleeve cap', () => {
  const woven = EASE_RANGES[0]!;
  it('judges the ease', () => {
    expect(sleeveCap(48, 45, woven)).toEqual({ ease: 3, verdict: 'ok', change: 0 });
    expect(sleeveCap(51, 45, woven)).toEqual({ ease: 6, verdict: 'high', change: -2 });
    expect(sleeveCap(45.5, 45, woven)).toEqual({ ease: 0.5, verdict: 'low', change: 1.5 });
  });
});

describe('bust', () => {
  it('cup from the difference', () => {
    expect(cupSize(90, 95)!.cup).toBe('B');
    expect(cupSize(90, 100)!.cup).toBe('D');
    expect(cupSize(90, 103)!.cup).toBe('DD / E');
    expect(cupSize(90, 89)!.cup).toBe('Below A');
  });
  it('adjustment against a B draft', () => {
    const r = bustAdjustment(90, 100, 5.08)!;
    expect(r.perSide).toBeCloseTo(2.46);
    expect(r.patternBust).toBeCloseTo(95.08);
    expect(bustAdjustment(90, 93, 5.08)!.perSide).toBeCloseTo(-1.04);
  });
});

describe('yardage', () => {
  it('reads pieces in several spellings', () => {
    const p = parsePieces('front 30 x 60 x2\n30×60 ×2\n30 60\nskirt 50x80\nnonsense\n\n', (n) => n);
    expect(p.pieces).toEqual([
      { w: 30, h: 60, count: 2 },
      { w: 30, h: 60, count: 2 },
      { w: 30, h: 60, count: 1 },
      { w: 50, h: 80, count: 1 },
    ]);
    expect(p.bad).toEqual(['nonsense']);
  });
  it('rewrites a list between units, keeping names and counts', () => {
    expect(convertPieces('front 60 × 80 × 2\nskirt 50x80', 1 / 2.54)).toBe('front 23.6 × 31.5 × 2\nskirt 19.7x31.5');
    expect(convertPieces('a 10 × 20 × 3', 2.54)).toBe('a 25.4 × 50.8 × 3');
  });
  it('estimates a length and checks the widest piece', () => {
    const r = yardage([{ w: 60, h: 80, count: 2 }, { w: 30, h: 60, count: 2 }], 150, 0.15, 'cm')!;
    expect(r.area).toBe(13200);
    // 13200 / 150 × 1.15 = 101.2 → 110
    expect(r.length).toBe(110);
    expect(r.fits).toBe(true);
    expect(yardage([{ w: 200, h: 200, count: 1 }], 150, 0, 'cm')!.fits).toBe(false);
  });
});
