// Fabric weight: gsm and oz/yd², weight class, and the trick of weighing a
// piece of fabric to find out how long it is. Lengths in cm, weights in grams.

export const GSM_PER_OZ_YD2 = 33.906;

export function ozToGsm(oz: number): number {
  return oz * GSM_PER_OZ_YD2;
}

export function gsmToOz(gsm: number): number {
  return gsm / GSM_PER_OZ_YD2;
}

export interface WeightClass {
  max: number;
  name: string;
  fabrics: string;
}

export const WEIGHT_CLASSES: WeightClass[] = [
  { max: 100, name: 'Very light', fabrics: 'chiffon, voile, organza, batiste, silk habotai' },
  { max: 150, name: 'Light', fabrics: 'lawn, rayon challis, shirting, tencel, light jersey' },
  { max: 250, name: 'Medium', fabrics: 'poplin, linen, quilting cotton, chambray, cotton jersey, interlock' },
  { max: 350, name: 'Medium-heavy', fabrics: 'twill, light denim, ponte, French terry, sweatshirting' },
  { max: Infinity, name: 'Heavy', fabrics: 'denim 12 oz+, canvas, coating, upholstery' },
];

export function weightClass(gsm: number): WeightClass {
  return WEIGHT_CLASSES.find((c) => gsm <= c.max) ?? WEIGHT_CLASSES[WEIGHT_CLASSES.length - 1]!;
}

/** Length of a piece of fabric from its weight, its gsm and its width. */
export function lengthFromWeight(grams: number, gsm: number, widthCm: number): number | null {
  if (!(grams > 0) || !(gsm > 0) || !(widthCm > 0)) return null;
  const areaM2 = grams / gsm;
  return (areaM2 / (widthCm / 100)) * 100;
}

/** gsm from a weighed sample of known size. */
export function gsmFromSample(grams: number, wCm: number, hCm: number): number | null {
  if (!(grams > 0) || !(wCm > 0) || !(hCm > 0)) return null;
  return grams / ((wCm * hCm) / 10000);
}

/** What a length of fabric weighs. */
export function weightOfLength(lengthCm: number, gsm: number, widthCm: number): number | null {
  if (!(lengthCm > 0) || !(gsm > 0) || !(widthCm > 0)) return null;
  return gsm * (lengthCm / 100) * (widthCm / 100);
}
