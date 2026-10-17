// Bias strips: how much continuous bias a piece of fabric yields, and the
// reverse. All lengths in cm.

/** Share of the raw strip length lost to the diagonal joins and squaring up. */
export const BIAS_WASTE = 0.1;

export interface BiasYield {
  /** Continuous bias length you can expect, after joins and trimming. */
  length: number;
  /** How many strips the piece cuts into, roughly. */
  strips: number;
}

/**
 * Continuous bias from a rectangle `w` × `h` cut into strips `strip` wide.
 * The usable area is the rectangle less one strip-width's triangle at each
 * end of the diagonal, then a tenth comes off for the joins.
 */
export function biasFromPiece(w: number, h: number, strip: number): BiasYield | null {
  if (!(w > 0) || !(h > 0) || !(strip > 0)) return null;
  const usable = w * h - strip * strip;
  if (usable <= 0) return { length: 0, strips: 0 };
  const raw = usable / strip;
  const length = raw * (1 - BIAS_WASTE);
  const diagonal = Math.hypot(w, h);
  return { length, strips: Math.max(1, Math.round(diagonal / strip)) };
}

/** Side of the square that yields `length` of bias `strip` wide. */
export function squareForBias(length: number, strip: number): number | null {
  if (!(length > 0) || !(strip > 0)) return null;
  const raw = length / (1 - BIAS_WASTE);
  return Math.sqrt(raw * strip + strip * strip);
}

/** Binding to buy or make for an edge: its length plus an overlap for the join. */
export function bindingNeeded(edgeLength: number, overlap = 25): number {
  return edgeLength + overlap;
}

export type BindingFold = 'single' | 'double';

/**
 * Cut width of a strip for a finished binding width. Double-fold binding is
 * four times the finished width; single-fold is twice. Thick fabric needs a
 * little more for the turn of the cloth.
 */
export function stripWidthFor(finished: number, fold: BindingFold, thick = false): number {
  const base = fold === 'double' ? finished * 4 : finished * 2;
  return base + (thick ? 0.3 : 0);
}
