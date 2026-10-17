// Comparing fabric prices sold by the metre, half metre, yard or fat quarter
// at different widths: everything comes down to a price per square metre.
// Lengths in cm.

export interface SoldPer {
  id: string;
  name: string;
  /** Length of one unit, or null for a fat quarter (which has its own size). */
  length: number | null;
}

export const SOLD_PER: SoldPer[] = [
  { id: 'm', name: 'Metre', length: 100 },
  { id: 'half', name: 'Half metre', length: 50 },
  { id: 'yd', name: 'Yard', length: 91.44 },
  { id: 'halfyd', name: 'Half yard', length: 45.72 },
  { id: 'fq', name: 'Fat quarter', length: null },
];

export interface Offer {
  price: number;
  per: string;
  width: number;
}

/** Area of one unit in square metres. A fat quarter is half the width by half a metre (or yard). */
export function unitArea(per: string, widthCm: number): number | null {
  const sold = SOLD_PER.find((s) => s.id === per);
  if (!sold || !(widthCm > 0)) return null;
  if (sold.length === null) return ((widthCm / 2) * 50) / 10000;
  return (sold.length * widthCm) / 10000;
}

export function pricePerSquareMetre(o: Offer): number | null {
  const area = unitArea(o.per, o.width);
  if (area === null || !(o.price >= 0)) return null;
  return o.price / area;
}

/** The price of a length at a width, from a price per square metre. */
export function priceFor(perM2: number, lengthCm: number, widthCm: number): number {
  return (perM2 * (lengthCm / 100) * widthCm) / 100;
}
