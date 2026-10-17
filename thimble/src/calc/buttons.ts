// Button placement along a placket and buttonhole length. All lengths in cm,
// positions measured from the top of the placket.

export interface ByCount {
  mode: 'count';
  length: number;
  count: number;
  top: number;
  bottom: number;
}

export interface BySpacing {
  mode: 'spacing';
  length: number;
  spacing: number;
  top: number;
  bottom: number;
}

/** One button must land on `anchor` (the bust line, say); the rest step out from it. */
export interface ByAnchor {
  mode: 'anchor';
  length: number;
  spacing: number;
  anchor: number;
  top: number;
  bottom: number;
}

export type ButtonInput = ByCount | BySpacing | ByAnchor;

export interface ButtonResult {
  positions: number[];
  spacing: number;
}

export function placeButtons(i: ButtonInput): ButtonResult | null {
  if (!(i.length > 0) || i.top < 0 || i.bottom < 0) return null;
  const span = i.length - i.top - i.bottom;
  if (span < 0) return null;

  if (i.mode === 'count') {
    if (!(i.count >= 1) || !Number.isInteger(i.count)) return null;
    if (i.count === 1) return { positions: [i.top + span / 2], spacing: 0 };
    const spacing = span / (i.count - 1);
    const positions = Array.from({ length: i.count }, (_, k) => i.top + k * spacing);
    return { positions, spacing };
  }

  if (!(i.spacing > 0)) return null;

  if (i.mode === 'spacing') {
    const count = Math.floor(span / i.spacing + 1e-9) + 1;
    const positions = Array.from({ length: count }, (_, k) => i.top + k * i.spacing);
    return { positions, spacing: i.spacing };
  }

  // anchor
  if (i.anchor < i.top || i.anchor > i.length - i.bottom) return null;
  const positions: number[] = [];
  for (let p = i.anchor; p >= i.top - 1e-9; p -= i.spacing) positions.unshift(p);
  for (let p = i.anchor + i.spacing; p <= i.length - i.bottom + 1e-9; p += i.spacing) positions.push(p);
  return { positions, spacing: i.spacing };
}

export type ButtonShape = 'flat' | 'domed' | 'ball';

/**
 * Buttonhole length: the button's diameter plus its thickness, plus 3 mm so it
 * passes through. A ball button needs half its circumference instead of its
 * diameter.
 */
export function buttonholeLength(diameter: number, thickness: number, shape: ButtonShape): number | null {
  if (!(diameter > 0) || thickness < 0) return null;
  const ease = 0.3;
  if (shape === 'ball') return (Math.PI * diameter) / 2 + ease;
  return diameter + thickness + ease;
}
