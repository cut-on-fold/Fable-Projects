// Stretch percentage and negative ease for knits. All lengths in cm.

/** Fold the fabric, mark `marked` on the fold, stretch comfortably to `stretched`. */
export function stretchPercent(marked: number, stretched: number): number | null {
  if (!(marked > 0) || !(stretched >= 0)) return null;
  return (stretched - marked) / marked;
}

export interface StretchBand {
  max: number;
  name: string;
  fabrics: string;
}

export const STRETCH_BANDS: StretchBand[] = [
  { max: 0.2, name: 'Stable knit', fabrics: 'ponte, scuba, heavy double knit, sweatshirt fleece' },
  { max: 0.35, name: 'Moderate stretch', fabrics: 'interlock, French terry, most cotton jerseys' },
  { max: 0.6, name: 'Stretchy', fabrics: 'cotton lycra, ITY, rib knit, bamboo jersey' },
  { max: Infinity, name: 'Very stretchy', fabrics: 'swimwear and activewear lycra, 4-way stretch, power mesh' },
];

export function stretchBand(fraction: number): StretchBand {
  return STRETCH_BANDS.find((b) => fraction <= b.max) ?? STRETCH_BANDS[STRETCH_BANDS.length - 1]!;
}

/** The finished garment measurement for a body measurement with negative ease. */
export function withNegativeEase(body: number, ease: number): number | null {
  if (!(body > 0) || ease < 0 || ease >= 1) return null;
  return body * (1 - ease);
}

/** The negative ease a finished measurement gives on a body measurement. */
export function easeFromFinished(body: number, finished: number): number | null {
  if (!(body > 0) || !(finished > 0)) return null;
  return (body - finished) / body;
}
