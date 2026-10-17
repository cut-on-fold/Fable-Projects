// Gathers and ruffles: cut length for a finished length at a gathering
// ratio, how many strips that is across the fabric, and the fabric to buy.
// All lengths in cm.

export interface RuffleInput {
  finishedLength: number;
  /** 2 means the strip is twice the finished length. */
  ratio: number;
  finishedDepth: number;
  /** Hem depth; a double-fold hem turns twice this. */
  hem: number;
  doubleFoldHem: boolean;
  seamAllowance: number;
  fabricWidth: number;
}

export interface RuffleResult {
  cutLength: number;
  cutDepth: number;
  strips: number;
  /** Fabric length to buy or cut off the bolt, strips cut across the width. */
  fabricLength: number;
}

export function ruffle(i: RuffleInput): RuffleResult | null {
  if (!(i.finishedLength > 0) || !(i.ratio > 0)) return null;
  const cutLength = i.finishedLength * i.ratio;
  const hem = i.doubleFoldHem ? 2 * i.hem : i.hem;
  const cutDepth = i.finishedDepth + hem + i.seamAllowance;
  if (!(i.fabricWidth > 0)) return { cutLength, cutDepth, strips: 0, fabricLength: 0 };
  // Each join between strips uses a seam allowance on both strips.
  const usable = i.fabricWidth - 2 * i.seamAllowance;
  if (usable <= 0) return null;
  const strips = Math.ceil(cutLength / usable - 1e-9);
  return { cutLength, cutDepth, strips, fabricLength: strips * cutDepth };
}

/** The finished length a strip gathers down to. */
export function finishedFromStrip(stripLength: number, ratio: number): number | null {
  if (!(stripLength > 0) || !(ratio > 0)) return null;
  return stripLength / ratio;
}
