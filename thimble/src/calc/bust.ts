// Sewing cup size from the high bust and full bust, and the full or small
// bust adjustment against the cup a pattern is drafted for. Lengths in cm.
// Sewing cups go by the difference alone (an inch a cup), not by bra size.

export interface CupBand {
  max: number;
  cup: string;
}

const IN = 2.54;

export const CUPS: CupBand[] = [
  { max: 1.5 * IN, cup: 'A' },
  { max: 2.5 * IN, cup: 'B' },
  { max: 3.5 * IN, cup: 'C' },
  { max: 4.5 * IN, cup: 'D' },
  { max: 5.5 * IN, cup: 'DD / E' },
  { max: 6.5 * IN, cup: 'F' },
  { max: 7.5 * IN, cup: 'G' },
  { max: 8.5 * IN, cup: 'H' },
  { max: Infinity, cup: 'I or above' },
];

export function cupSize(highBust: number, fullBust: number): { difference: number; cup: string } | null {
  if (!(highBust > 0) || !(fullBust > 0)) return null;
  const difference = fullBust - highBust;
  const band = CUPS.find((c) => difference <= c.max) ?? CUPS[CUPS.length - 1]!;
  return { difference, cup: difference < 0 ? 'Below A' : band.cup };
}

/** The difference a pattern drafts for, by the cup it names. B is the usual. */
export const DRAFTED_FOR: Array<{ id: string; name: string; difference: number }> = [
  { id: 'A', name: 'A cup (1 in / 2.5 cm)', difference: 1 * IN },
  { id: 'B', name: 'B cup (2 in / 5 cm), the usual draft', difference: 2 * IN },
  { id: 'C', name: 'C cup (3 in / 7.5 cm)', difference: 3 * IN },
  { id: 'D', name: 'D cup (4 in / 10 cm)', difference: 4 * IN },
  { id: 'E', name: 'E cup (5 in / 12.5 cm)', difference: 5 * IN },
  { id: 'F', name: 'F cup (6 in / 15 cm)', difference: 6 * IN },
  { id: 'G', name: 'G cup (7 in / 18 cm)', difference: 7 * IN },
  { id: 'H', name: 'H cup (8 in / 20 cm)', difference: 8 * IN },
];

export interface AdjustmentResult {
  /** Positive: full bust adjustment per side. Negative: small bust adjustment per side. */
  perSide: number;
  /** The full bust the pattern size would give, chosen by the high bust. */
  patternBust: number;
}

export function bustAdjustment(highBust: number, fullBust: number, draftedDifference: number): AdjustmentResult | null {
  if (!(highBust > 0) || !(fullBust > 0) || !(draftedDifference >= 0)) return null;
  const yours = fullBust - highBust;
  return { perSide: (yours - draftedDifference) / 2, patternBust: highBust + draftedDifference };
}
