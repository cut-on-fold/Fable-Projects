// Lengths are kept in centimetres inside every calculator. These helpers turn
// what someone types at the cutting table ("1 1/2", "5/8", "12.7", '45"', "2 yd")
// into centimetres, and format centimetres back out in the chosen unit.

export type Unit = 'cm' | 'in';

export const CM_PER_IN = 2.54;

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4',
  '⅛': ' 1/8', '⅜': ' 3/8', '⅝': ' 5/8', '⅞': ' 7/8',
  '⅓': ' 1/3', '⅔': ' 2/3', '⅙': ' 1/6', '⅚': ' 5/6',
};

/** Parse a plain number, a fraction ("3/8") or a mixed number ("1 1/2", "1-1/2"). */
export function parseNumber(text: string): number | null {
  let s = text.trim().replace(/,/g, '.');
  for (const [glyph, ascii] of Object.entries(UNICODE_FRACTIONS)) s = s.replace(glyph, ascii);
  s = s.trim();
  if (s === '') return null;
  const mixed = /^(-)?(\d+(?:\.\d+)?)?(?:[\s-]*(\d+)\s*\/\s*(\d+))?$/.exec(s);
  if (!mixed) return null;
  const [, sign, whole, num, den] = mixed;
  if (whole === undefined && num === undefined) return null;
  let value = whole ? parseFloat(whole) : 0;
  if (num !== undefined && den !== undefined) {
    const d = parseFloat(den);
    if (d === 0) return null;
    value += parseFloat(num) / d;
  }
  return sign ? -value : value;
}

const SUFFIXES: Array<[RegExp, number]> = [
  [/(mm|millimet(?:re|er)s?)$/i, 0.1],
  [/(cm|centimet(?:re|er)s?)$/i, 1],
  [/(m|met(?:re|er)s?)$/i, 100],
  [/(in|inch(?:es)?|"|″|”)$/i, CM_PER_IN],
  [/(yd|yards?)$/i, 36 * CM_PER_IN],
  [/(ft|feet|foot|'|′)$/i, 12 * CM_PER_IN],
];

/**
 * Parse a length typed in `unit`, honouring an explicit suffix if there is one.
 * A `long` field takes bare numbers as metres or yards instead of cm or inches.
 * Returns cm.
 */
export function parseLength(text: string, unit: Unit, long = false): number | null {
  const s = text.trim();
  for (const [re, factor] of SUFFIXES) {
    const m = re.exec(s);
    if (m && m.index > 0) {
      const n = parseNumber(s.slice(0, m.index));
      return n === null ? null : n * factor;
    }
  }
  const n = parseNumber(s);
  if (n === null) return null;
  if (long) return unit === 'in' ? n * 36 * CM_PER_IN : n * 100;
  return unit === 'in' ? n * CM_PER_IN : n;
}

/** The unit label a length box shows. */
export function unitLabel(unit: Unit, long = false): string {
  return long ? (unit === 'in' ? 'yd' : 'm') : unit;
}

export function toUnit(cm: number, unit: Unit): number {
  return unit === 'in' ? cm / CM_PER_IN : cm;
}

export function fromUnit(value: number, unit: Unit): number {
  return unit === 'in' ? value * CM_PER_IN : value;
}

/** Round to the nearest 1/denominator and write as a mixed number: 4 7/8. */
export function formatFraction(value: number, denominator = 8): string {
  const sign = value < 0 ? '-' : '';
  const total = Math.round(Math.abs(value) * denominator);
  const whole = Math.floor(total / denominator);
  let num = total % denominator;
  let den = denominator;
  while (num > 0 && num % 2 === 0 && den % 2 === 0) { num /= 2; den /= 2; }
  if (num === 0) return `${sign}${whole}`;
  if (whole === 0) return `${sign}${num}/${den}`;
  return `${sign}${whole} ${num}/${den}`;
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export interface FormatOptions {
  /** Centimetre decimals (default 1). Inches always round to an eighth, or a sixteenth under 1 in. */
  decimals?: number;
  /** Show metres / yards for long lengths (default false). */
  long?: boolean;
}

/** Format centimetres in the chosen unit, with its unit label. */
export function formatLength(cm: number, unit: Unit, opts: FormatOptions = {}): string {
  if (!Number.isFinite(cm)) return '–';
  if (unit === 'in') {
    const inches = cm / CM_PER_IN;
    if (opts.long && Math.abs(inches) >= 36) {
      return `${formatFraction(inches / 36, 8)} yd`;
    }
    const denom = Math.abs(inches) < 1 ? 16 : 8;
    return `${formatFraction(inches, denom)} in`;
  }
  if (opts.long && Math.abs(cm) >= 100) {
    return `${trimZeros((cm / 100).toFixed(2))} m`;
  }
  const decimals = opts.decimals ?? 1;
  return `${trimZeros(cm.toFixed(decimals))} cm`;
}

/** Round a length UP to the next buying step: 10 cm, or 1/8 yd. Returns cm. */
export function roundUpToBuy(cm: number, unit: Unit): number {
  if (cm <= 0) return 0;
  if (unit === 'in') {
    const eighthYd = 36 * CM_PER_IN / 8;
    return Math.ceil(cm / eighthYd - 1e-9) * eighthYd;
  }
  return Math.ceil(cm / 10 - 1e-9) * 10;
}

/** Format a length that has already been rounded up to a buying step: "1.3 m" or "1 3/8 yd". */
export function formatBuy(cm: number, unit: Unit): string {
  if (unit === 'in') return `${formatFraction(cm / CM_PER_IN / 36, 8)} yd`;
  return `${trimZeros((cm / 100).toFixed(1))} m`;
}

export function formatPercent(fraction: number, decimals = 0): string {
  return `${trimZeros((fraction * 100).toFixed(decimals))}%`;
}

/** The value to show in an input box for a stored cm value, in the current unit. */
export function inputText(cm: number | null, unit: Unit, long = false): string {
  if (cm === null || !Number.isFinite(cm)) return '';
  if (long) return unit === 'in' ? formatFraction(cm / CM_PER_IN / 36, 8) : trimZeros((cm / 100).toFixed(2));
  if (unit === 'in') return formatFraction(cm / CM_PER_IN, 16);
  return trimZeros(cm.toFixed(2));
}
