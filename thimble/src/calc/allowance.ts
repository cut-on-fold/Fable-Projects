// Seam allowances: what to trim or add when you sew at a different allowance
// from the pattern, and the finished measurement from a pattern piece measured
// flat. Lengths in cm.

export interface AllowanceChange {
  /** Positive: add this much to every edge. Negative: trim it off. Zero: nothing to do. */
  change: number;
}

export function allowanceChange(patternAllowance: number, sewingAllowance: number): AllowanceChange | null {
  if (patternAllowance < 0 || sewingAllowance < 0) return null;
  return { change: sewingAllowance - patternAllowance };
}

export interface FlatMeasure {
  /** Finished measurement once the allowances are sewn. */
  finished: number;
  /** Ease against the body, positive when the garment is bigger. */
  ease: number | null;
}

/**
 * @param measured edge to edge across the piece, seam allowances in
 * @param allowance the seam allowance on the piece
 * @param allowances how many seam allowances the measurement crosses (2 for a piece measured side to side)
 * @param times how many times the piece goes round (2 for a front cut on the fold that is half the front, 4 for a quarter)
 * @param body the body measurement to compare, if any
 */
export function finishedFromFlat(measured: number, allowance: number, allowances: number, times: number, body: number | null): FlatMeasure | null {
  if (!(measured > 0) || allowance < 0 || allowances < 0 || !(times > 0)) return null;
  const finished = (measured - allowances * allowance) * times;
  if (finished <= 0) return null;
  return { finished, ease: body !== null && body > 0 ? finished - body : null };
}
