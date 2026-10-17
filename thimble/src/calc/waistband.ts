// Straight waistbands and cuffs in wovens: cut sizes and interfacing. Lengths
// in cm.

export interface BandInput {
  /** Waist or wrist, where the band sits. */
  body: number;
  ease: number;
  /** Extension for the button or hook: 0 for a band that meets edge to edge. */
  underlap: number;
  finishedWidth: number;
  seamAllowance: number;
  /** Interface the whole band (folded double) or only the outer half. */
  interfaceAll: boolean;
}

export interface BandResult {
  cutLength: number;
  cutWidth: number;
  /** The finished band, end to end, underlap included. */
  finishedLength: number;
  interfacingLength: number;
  interfacingWidth: number;
  /** Where the side seams and centre back fall along the band from the left end, seam allowance included. */
  marks: Array<{ name: string; position: number }>;
}

export function waistband(i: BandInput): BandResult | null {
  if (!(i.body > 0) || i.ease < 0 || i.underlap < 0 || !(i.finishedWidth > 0) || i.seamAllowance < 0) return null;
  const finishedLength = i.body + i.ease + i.underlap;
  const cutLength = finishedLength + 2 * i.seamAllowance;
  const cutWidth = 2 * i.finishedWidth + 2 * i.seamAllowance;
  const loop = i.body + i.ease;
  const marks = [
    { name: 'Centre front (left end)', position: i.seamAllowance },
    { name: 'Side seam', position: i.seamAllowance + loop / 4 },
    { name: 'Centre back', position: i.seamAllowance + loop / 2 },
    { name: 'Side seam', position: i.seamAllowance + (3 * loop) / 4 },
    { name: 'Centre front', position: i.seamAllowance + loop },
  ];
  if (i.underlap > 0) marks.push({ name: 'End of underlap', position: i.seamAllowance + loop + i.underlap });
  return {
    cutLength,
    cutWidth,
    finishedLength,
    interfacingLength: cutLength,
    interfacingWidth: i.interfaceAll ? cutWidth : i.finishedWidth + i.seamAllowance,
    marks,
  };
}
