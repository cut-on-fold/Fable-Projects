import { describe, expect, it } from 'vitest';
import { defaultColumns, parseCsv, statuses, toRecords } from '../src/csv';
import { TEMPLATES, fits, perPage, position } from '../src/templates';

describe('csv', () => {
  it('reads a Stash export with a BOM, CRLF, quotes and line breaks', () => {
    const text = '﻿Name,Status,Fabric type,Notes\r\n"Liberty lawn, blue",Uncut,Lawn,"Bought for a ""Marston"".\r\nSecond line"\r\nPonte,Remnant,Ponte,\r\n';
    const t = parseCsv(text);
    expect(t.header).toEqual(['Name', 'Status', 'Fabric type', 'Notes']);
    expect(t.rows).toHaveLength(2);
    expect(t.rows[0]).toEqual(['Liberty lawn, blue', 'Uncut', 'Lawn', 'Bought for a "Marston".\r\nSecond line']);
    expect(t.rows[1]).toEqual(['Ponte', 'Remnant', 'Ponte', '']);
    const r = toRecords(t);
    expect(r[1]!['Fabric type']).toBe('Ponte');
    expect(statuses(r)).toEqual(['Remnant', 'Uncut']);
  });
  it('skips blank lines and short rows', () => {
    const t = parseCsv('a,b,c\n1,2\n\n4,5,6\n');
    expect(t.rows).toEqual([['1', '2', ''], ['4', '5', '6']]);
  });
  it('picks printable columns the file has', () => {
    expect(defaultColumns(['Name', 'Status', 'Fabric type', 'Composition', 'Purchase length', 'Remaining length', 'Width', 'Weight', 'Prewashed', 'Photos']))
      .toEqual(['Fabric type', 'Composition', 'Width', 'Remaining length', 'Weight']);
    expect(defaultColumns(['Name', 'Designer', 'Garment type', 'Size range', 'Format'], 3)).toEqual(['Designer', 'Garment type', 'Size range']);
  });
});

describe('templates', () => {
  it('every template fits its page', () => {
    for (const t of TEMPLATES) expect(fits(t), t.id).toBe(true);
  });
  it('positions labels across then down', () => {
    const t = TEMPLATES.find((x) => x.id === 'L7160')!;
    expect(perPage(t)).toBe(21);
    expect(position(t, 0)).toEqual({ x: 7.2, y: 15.15 });
    expect(position(t, 1).x).toBeCloseTo(7.2 + 63.5 + 2.54);
    expect(position(t, 3)).toEqual({ x: 7.2, y: 15.15 + 38.1 });
  });
});
