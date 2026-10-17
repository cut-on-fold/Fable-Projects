// Sleeve cap ease: the cap seam line against the armscye seam line, and what
// the fabric wants. Lengths in cm.

export interface EaseRange {
  id: string;
  name: string;
  min: number;
  max: number;
  note: string;
}

export const EASE_RANGES: EaseRange[] = [
  { id: 'woven', name: 'Woven, set-in sleeve', min: 2, max: 4, note: 'Tailored sleeves sit at the top of the range; crisp cottons at the bottom.' },
  { id: 'shirt', name: 'Shirt sleeve (flat-felled or sewn flat)', min: 0.5, max: 1.5, note: 'Sewn in flat before the side seam, so it needs almost none.' },
  { id: 'knit', name: 'Knit', min: 0, max: 1, note: 'The fabric gives; ease only makes ripples.' },
  { id: 'drop', name: 'Dropped shoulder or raglan', min: 0, max: 0.5, note: 'The cap is nearly flat; match the lengths.' },
];

export interface SleeveResult {
  ease: number;
  verdict: 'low' | 'ok' | 'high';
  /** How much to take out of (negative) or add to (positive) the cap to reach the nearest end of the range. */
  change: number;
}

export function sleeveCap(cap: number, armscye: number, range: EaseRange): SleeveResult | null {
  if (!(cap > 0) || !(armscye > 0)) return null;
  const ease = cap - armscye;
  if (ease < range.min) return { ease, verdict: 'low', change: range.min - ease };
  if (ease > range.max) return { ease, verdict: 'high', change: range.max - ease };
  return { ease, verdict: 'ok', change: 0 };
}
