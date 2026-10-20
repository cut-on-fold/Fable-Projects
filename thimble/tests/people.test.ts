import { describe, expect, it } from 'vitest';
import { mergePeople, parseCsv, peopleFromCsv } from '../src/people';
import { searchBurn } from '../src/calc/burn';
import { searchFinishes } from '../src/calc/finishes';
import { searchPressing } from '../src/calc/pressing';

describe('people from Measurements.csv', () => {
  // Made-up people with round numbers; nothing here is anyone's real measurement.
  const csv = '﻿Name,Status,Height,High bust,Full bust / chest,Waist,Hips,Wrist circumference,Notes\r\nAsh,Current,66 in,34 in,37.5 in,30 in,40 in,6 in,"Measured May"\r\nJo,Current,72 in,,42 in,36 in,40 in,,\r\nNan,Archived,62 in,36 in,39 in,34 in,41 in,,old\r\nNan,Current,62 in,36 in,40 in,35 in,42 in,6.5 in,\r\n';
  it('reads current people with their measurements in cm', () => {
    const p = peopleFromCsv(csv);
    expect(p.map((x) => x.name)).toEqual(['Ash', 'Jo', 'Nan']);
    expect(p[0]!.measures['Waist']).toBeCloseTo(30 * 2.54);
    expect(p[0]!.measures['Full bust / chest']).toBeCloseTo(37.5 * 2.54);
    expect(p[0]!.measures['Notes']).toBeUndefined();
    expect(p[1]!.measures['High bust']).toBeUndefined();
    expect(p[2]!.measures['Waist']).toBeCloseTo(35 * 2.54);
  });
  it('takes metric values and bare numbers as inches', () => {
    const p = peopleFromCsv('Name,Waist\nA,90 cm\nB,34\n');
    expect(p[0]!.measures['Waist']).toBe(90);
    expect(p[1]!.measures['Waist']).toBeCloseTo(86.36);
  });
  it('merges by name, case-insensitively, and sorts', () => {
    const merged = mergePeople([{ name: 'nan', measures: { Waist: 90 } }, { name: 'Ash', measures: {} }], [{ name: 'Nan', measures: { Waist: 94 } }]);
    expect(merged.map((p) => p.name)).toEqual(['Ash', 'Nan']);
    expect(merged[1]!.measures['Waist']).toBe(94);
  });
  it('csv edge cases', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n').rows).toEqual([['x, y', 'say "hi"']]);
    expect(peopleFromCsv('nothing here')).toEqual([]);
  });
});

describe('reference lookups', () => {
  it('pressing by fibre', () => {
    expect(searchPressing('silk')[0]!.fibre).toBe('Silk');
    expect(searchPressing('ponte').map((e) => e.fibre)).toContain('Elastane blends');
    expect(searchPressing('').length).toBeGreaterThan(10);
  });
  it('finishes by fabric', () => {
    expect(searchFinishes('chiffon')[0]!.best).toMatch(/French seam/);
    expect(searchFinishes('swim')[0]!.fabric).toBe('Swimwear and activewear');
  });
  it('burn test by what you saw', () => {
    expect(searchBurn('vinegar')[0]!.fibre).toBe('Acetate');
    expect(searchBurn('hair bead').map((e) => e.fibre).slice(0, 2)).toEqual(['Silk', 'Wool']);
    expect(searchBurn('paper ash').map((e) => e.fibre)).toContain('Cotton');
  });
});
