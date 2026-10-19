import { describe, expect, it } from 'vitest';
import { HEAD_DOTS, THERMAL_LABELS, layoutLabel, ptToPx, thermalPixels, wrapText, type Measure } from '../src/thermal';

// A pretend font: every character is half the font size wide.
const measure: Measure = (text, font) => {
  const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)![1]!);
  return text.length * px * 0.5;
};

describe('thermal sizes', () => {
  it('every B21 label fits the print head', () => {
    for (const l of THERMAL_LABELS) {
      const px = thermalPixels(l);
      expect(px.width, l.id).toBeLessThanOrEqual(HEAD_DOTS);
      expect(px.height).toBe(l.length * 8);
    }
    expect(thermalPixels({ width: 50, length: 30 })).toEqual({ width: 384, height: 240 });
    expect(thermalPixels({ width: 40, length: 20 })).toEqual({ width: 320, height: 160 });
  });
  it('points to dots', () => {
    expect(ptToPx(9)).toBeCloseTo(25.4);
  });
});

describe('wrapping', () => {
  it('breaks on words, keeps a long word whole', () => {
    expect(wrapText('Liberty lawn Betsy blue', 100, '20px x', measure)).toEqual(['Liberty', 'lawn Betsy', 'blue']);
    expect(wrapText('Supercalifragilistic lawn', 60, '20px x', measure)).toEqual(['Supercalifragilistic', 'lawn']);
    expect(wrapText('', 60, '20px x', measure)).toEqual([]);
  });
});

describe('layout', () => {
  const spec = { width: 384, height: 240, pad: 12, fontPx: 28, family: 'x' };
  it('title bold and larger, lines below, continuation indented', () => {
    const l = layoutLabel('Navy ponte', ['Fabric type: Ponte', 'Composition: 70% viscose 25% nylon 5% elastane'], spec, measure);
    expect(l.dropped).toBe(0);
    expect(l.placed[0]).toMatchObject({ text: 'Navy ponte', x: 12, font: 'bold 35px x' });
    expect(l.placed[1]).toMatchObject({ text: 'Fabric type: Ponte', x: 12, font: '28px x' });
    const cont = l.placed.filter((p) => p.x > 12);
    expect(cont.length).toBeGreaterThan(0);
    for (let i = 1; i < l.placed.length; i++) expect(l.placed[i]!.y).toBeGreaterThan(l.placed[i - 1]!.y);
    expect(l.placed[l.placed.length - 1]!.y).toBeLessThanOrEqual(240 - 12);
  });
  it('drops what does not fit on a short label', () => {
    const l = layoutLabel('Navy ponte', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], { ...spec, height: 120 }, measure);
    expect(l.dropped).toBeGreaterThan(0);
    expect(l.placed.every((p) => p.y <= 120 - 12)).toBe(true);
  });
});
