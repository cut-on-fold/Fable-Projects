// Fabric width conversion: a pattern asks for a length at one width and the
// bolt in front of you is another. The area stays the same, then the answer
// rounds up to the next buying step. Pattern envelopes' conversion charts
// agree with this to within an eighth of a yard for ordinary garments.
// All lengths in cm.

import { roundUpToBuy, type Unit } from '../units';

export function convertWidth(length: number, fromWidth: number, toWidth: number, unit: Unit): number | null {
  if (!(length > 0) || !(fromWidth > 0) || !(toWidth > 0)) return null;
  return roundUpToBuy((length * fromWidth) / toWidth, unit);
}

export const COMMON_WIDTHS: Record<Unit, number[]> = {
  cm: [90, 110, 115, 140, 150, 160],
  in: [36, 45, 54, 60],
};

/** Length needed at each common width, for a chart. */
export function widthChart(length: number, fromWidth: number, unit: Unit): Array<{ width: number; length: number }> {
  const widths = COMMON_WIDTHS[unit].map((w) => (unit === 'in' ? w * 2.54 : w));
  return widths
    .map((width) => ({ width, length: convertWidth(length, fromWidth, width, unit) }))
    .filter((r): r is { width: number; length: number } => r.length !== null);
}
