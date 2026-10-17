import { describe, expect, it } from 'vitest';
import { formatBuy, formatFraction, formatLength, inputText, parseLength, parseNumber, roundUpToBuy } from '../src/units';

describe('parseNumber', () => {
  it('reads plain numbers, fractions and mixed numbers', () => {
    expect(parseNumber('12')).toBe(12);
    expect(parseNumber('12.5')).toBe(12.5);
    expect(parseNumber('12,5')).toBe(12.5);
    expect(parseNumber('3/8')).toBe(0.375);
    expect(parseNumber('1 1/2')).toBe(1.5);
    expect(parseNumber('1-1/2')).toBe(1.5);
    expect(parseNumber('2 ⅝')).toBe(2.625);
    expect(parseNumber('½')).toBe(0.5);
    expect(parseNumber('-1 1/4')).toBe(-1.25);
  });
  it('rejects nonsense', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1/0')).toBeNull();
    expect(parseNumber('1/')).toBeNull();
  });
});

describe('parseLength', () => {
  it('uses the current unit when there is no suffix', () => {
    expect(parseLength('10', 'cm')).toBe(10);
    expect(parseLength('10', 'in')).toBeCloseTo(25.4);
  });
  it('honours a suffix over the current unit', () => {
    expect(parseLength('10 in', 'cm')).toBeCloseTo(25.4);
    expect(parseLength('10"', 'cm')).toBeCloseTo(25.4);
    expect(parseLength('1 1/2″', 'cm')).toBeCloseTo(3.81);
    expect(parseLength('25 cm', 'in')).toBe(25);
    expect(parseLength('1.5 m', 'in')).toBe(150);
    expect(parseLength('2 yd', 'cm')).toBeCloseTo(182.88);
    expect(parseLength('250mm', 'cm')).toBe(25);
  });
});

describe('formatting', () => {
  it('writes inches as eighths and sixteenths under an inch', () => {
    expect(formatFraction(4.875)).toBe('4 7/8');
    expect(formatFraction(0.5)).toBe('1/2');
    expect(formatFraction(3)).toBe('3');
    expect(formatLength(2.54 * 4.9, 'in')).toBe('4 7/8 in');
    expect(formatLength(2.54 * 0.3, 'in')).toBe('5/16 in');
    expect(formatLength(2.54 * 40, 'in', { long: true })).toBe('1 1/8 yd');
  });
  it('writes centimetres to one decimal and metres when long', () => {
    expect(formatLength(12.34, 'cm')).toBe('12.3 cm');
    expect(formatLength(12, 'cm')).toBe('12 cm');
    expect(formatLength(150, 'cm', { long: true })).toBe('1.5 m');
  });
  it('rounds up to buying steps', () => {
    expect(roundUpToBuy(123, 'cm')).toBe(130);
    expect(roundUpToBuy(120, 'cm')).toBe(120);
    expect(formatBuy(130, 'cm')).toBe('1.3 m');
    expect(roundUpToBuy(100, 'in') / 2.54 / 36).toBeCloseTo(1.125);
    expect(formatBuy(roundUpToBuy(100, 'in'), 'in')).toBe('1 1/8 yd');
  });
  it('shows stored values in the input in the current unit', () => {
    expect(inputText(2.54 * 1.5, 'in')).toBe('1 1/2');
    expect(inputText(12.5, 'cm')).toBe('12.5');
    expect(inputText(null, 'cm')).toBe('');
  });
});
