// Shrinkage: measure a swatch before and after washing, then buy enough that
// what is left after pre-washing still covers the pattern. All lengths in cm.

import { roundUpToBuy, type Unit } from '../units';

/** Share lost: 0.05 for a swatch that went from 20 to 19. */
export function shrinkage(before: number, after: number): number | null {
  if (!(before > 0) || !(after >= 0)) return null;
  return (before - after) / before;
}

export interface BuyResult {
  /** Length to buy, rounded up to the next buying step. */
  buy: number;
  /** Width left after washing. */
  widthAfter: number;
}

export function lengthToBuy(needed: number, lengthShrink: number, fabricWidth: number, widthShrink: number, unit: Unit): BuyResult | null {
  if (!(needed > 0) || lengthShrink >= 1 || widthShrink >= 1) return null;
  const raw = needed / (1 - Math.max(0, lengthShrink));
  return { buy: roundUpToBuy(raw, unit), widthAfter: fabricWidth * (1 - Math.max(0, widthShrink)) };
}
