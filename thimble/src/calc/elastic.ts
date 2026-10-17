// Elastic and knit bands: how long to cut for a body measurement or an
// opening. All lengths in cm.

export interface ElasticKind {
  id: string;
  name: string;
  /** Share taken off the body measurement. */
  reduction: number;
  note: string;
}

export const ELASTIC_KINDS: ElasticKind[] = [
  { id: 'knitted', name: 'Knitted or braided waistband', reduction: 0.08, note: 'Everyday waistbands. Firmer elastic can take less off; soft elastic a little more.' },
  { id: 'woven', name: 'Woven (non-roll) waistband', reduction: 0.05, note: 'Keeps its width when stretched, so it needs less reduction.' },
  { id: 'swim', name: 'Swimwear legs and neckline', reduction: 0.10, note: 'Rubber swimwear elastic; stretch it more at the back of the leg opening.' },
  { id: 'foe', name: 'Fold-over elastic', reduction: 0.15, note: 'Necklines and leg bands on knits. Quarter the elastic and the opening and match the marks.' },
  { id: 'lingerie', name: 'Picot or plush-back lingerie elastic', reduction: 0.10, note: 'Less on the front, more over the curves.' },
  { id: 'clear', name: 'Clear elastic to stabilise', reduction: 0, note: 'Cut to the seam length; it is there to stop stretching, not to gather.' },
  { id: 'custom', name: 'Custom reduction', reduction: 0.08, note: 'Set the percentage yourself.' },
];

export interface ElasticResult {
  /** Finished loop length before the overlap. */
  finished: number;
  /** Length to cut, overlap included. */
  cut: number;
}

export function elasticLength(body: number, reduction: number, overlap: number): ElasticResult | null {
  if (!(body > 0) || reduction < 0 || reduction >= 1 || overlap < 0) return null;
  const finished = body * (1 - reduction);
  return { finished, cut: finished + overlap };
}

export interface BandKind {
  id: string;
  name: string;
  /** Band length as a share of the opening it is sewn to. */
  ratio: number;
}

export const BAND_KINDS: BandKind[] = [
  { id: 'neck', name: 'Neckband', ratio: 0.85 },
  { id: 'cuff', name: 'Cuff', ratio: 0.85 },
  { id: 'hem', name: 'Hem band', ratio: 0.9 },
  { id: 'waist', name: 'Waistband (rib)', ratio: 0.8 },
  { id: 'custom', name: 'Custom ratio', ratio: 0.85 },
];

export interface BandResult {
  /** Cut length, seam allowances at both ends included. */
  cutLength: number;
  /** Cut width for a band folded double. */
  cutWidth: number;
  /** Quarter marks along the band's finished loop, from the seam. */
  quarterMarks: number[];
}

export function knitBand(opening: number, ratio: number, finishedWidth: number, seamAllowance: number): BandResult | null {
  if (!(opening > 0) || !(ratio > 0) || !(ratio <= 1.5) || !(finishedWidth >= 0) || seamAllowance < 0) return null;
  const loop = opening * ratio;
  const cutLength = loop + 2 * seamAllowance;
  const cutWidth = 2 * finishedWidth + 2 * seamAllowance;
  const quarterMarks = [0, loop / 4, loop / 2, (3 * loop) / 4];
  return { cutLength, cutWidth, quarterMarks };
}
