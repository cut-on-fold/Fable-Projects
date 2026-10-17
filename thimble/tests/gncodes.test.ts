import { describe, expect, it } from 'vitest';
import { cmPerUnit, countFor, parseCutList, parsePieceName } from '../src/calc/gncodes';
import { circleSkirt } from '../src/calc/circle';

describe('piece names', () => {
  it('reads number, name and cut codes', () => {
    expect(parsePieceName('7 Skirt Back C2M')).toEqual({ number: 7, name: 'Skirt Back', codes: [{ count: 2, fabric: 'M', onFold: false }] });
    expect(parsePieceName('1 Bodice Front C1MOF')).toEqual({ number: 1, name: 'Bodice Front', codes: [{ count: 1, fabric: 'M', onFold: true }] });
    expect(parsePieceName('4 Neck Facing C1M C1I')!.codes).toEqual([{ count: 1, fabric: 'M', onFold: false }, { count: 1, fabric: 'I', onFold: false }]);
    expect(parsePieceName('7 Skirt Back C2M (mirrored)')!.name).toBe('Skirt Back');
    expect(parsePieceName('Pocket')).toEqual({ number: null, name: 'Pocket', codes: [] });
  });
  it('counts for a fabric', () => {
    const p = parsePieceName('4 Neck Facing C1M C1I C2L')!;
    expect(countFor(p.codes, 'M')).toEqual({ count: 1, onFold: false });
    expect(countFor(p.codes, 'l')).toEqual({ count: 2, onFold: false });
    expect(countFor(p.codes, 'C')).toEqual({ count: 0, onFold: false });
  });
});

describe('svg units', () => {
  it('mm patterns and 96-dpi exports', () => {
    expect(cmPerUnit('1600.0mm', 1600)).toBeCloseTo(0.1);
    expect(cmPerUnit('1239.245mm', 4683.762)).toBeCloseTo(2.54 / 96, 5);
    expect(cmPerUnit('10in', 960)).toBeCloseTo(2.54 / 96, 5);
    expect(cmPerUnit(null, null)).toBeCloseTo(2.54 / 96, 5);
  });
});

describe('cut list', () => {
  it('reads a Grain-Nest cut list', () => {
    const text = `Grain-Nest cut list
Generated: 2026-10-17 20:00:00
==========================================

PIECES
  6 Skirt Front C1MOF.svg        ×1
  7 Skirt Back C2M.svg           ×1
  7 Skirt Back C2M.svg (mirrored)×1
  9 Lining Front C1LOF           ×1

SHEET 1 of 1  (150 cm wide × 300 cm long fabric)
  Pieces placed:   4
  Length used:     120 cm  (of 300 cm specified)
  Utilisation:     71.51%

TOTAL FABRIC NEEDED
  1.2 m
`;
    expect(parseCutList(text)).toEqual([
      { name: '6 Skirt Front C1MOF', count: 1 },
      { name: '7 Skirt Back C2M', count: 1 },
      { name: '7 Skirt Back C2M (mirrored)', count: 1 },
      { name: '9 Lining Front C1LOF', count: 1 },
    ]);
  });
  it('reads a plain list', () => {
    expect(parseCutList('Front x2\nBack\nSleeve ×2\n\n')).toEqual([{ name: 'Front', count: 2 }, { name: 'Back', count: 1 }, { name: 'Sleeve', count: 2 }]);
    expect(parseCutList('Box 2\nCuff max 2\nPocket×3')).toEqual([{ name: 'Box 2', count: 1 }, { name: 'Cuff max 2', count: 1 }, { name: 'Pocket', count: 3 }]);
  });
});

describe('circle skirt hem ease', () => {
  it('the hem allowance is longer than the hem by 2π f d', () => {
    const r = circleSkirt({ waist: 76, ease: 2, fraction: 1, length: 60, waistAllowance: 1, hemAllowance: 1.5, seamAllowance: 1.5, fabricWidth: 150 })!;
    expect(r.hemEase).toBeCloseTo(2 * Math.PI * 1.5);
  });
});
