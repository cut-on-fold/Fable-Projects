// A homography is the map a projector makes from its own pixels onto a flat
// table: a rectangle on the screen lands as a four-sided shape on the table
// (keystone), and four matched points fix the whole map. It is what Pattern
// Projector's four-corner calibration is, and it is the starting point for the
// bendable mesh in mesh.ts. 3 × 3 matrices are kept row-major in a plain array.

export interface Pt {
  x: number;
  y: number;
}

/** Row-major 3 × 3: [a b c, d e f, g h i]. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Corners of a w × h rectangle from the origin: top-left, top-right, bottom-right, bottom-left. */
export function rectCorners(w: number, h: number): [Pt, Pt, Pt, Pt] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

/** Solve A x = b for a square system by Gaussian elimination with partial pivoting. Returns null if singular. */
export function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[best]![col]!)) best = r;
    if (Math.abs(m[best]![col]!) < 1e-12) return null;
    if (best !== col) [m[col], m[best]] = [m[best]!, m[col]!];
    const pivot = m[col]![col]!;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / pivot;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

/**
 * The homography taking the four `src` points to the four `dst` points, in
 * the same order. Null when either four are not a proper quadrilateral.
 */
export function homographyFromPoints(src: readonly Pt[], dst: readonly Pt[]): Mat3 | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const s = src[i]!;
    const d = dst[i]!;
    a.push([s.x, s.y, 1, 0, 0, 0, -s.x * d.x, -s.y * d.x]);
    b.push(d.x);
    a.push([0, 0, 0, s.x, s.y, 1, -s.x * d.y, -s.y * d.y]);
    b.push(d.y);
  }
  const x = solve(a, b);
  if (!x || x.some((v) => !Number.isFinite(v))) return null;
  return [x[0]!, x[1]!, x[2]!, x[3]!, x[4]!, x[5]!, x[6]!, x[7]!, 1];
}

export function applyHomography(h: Mat3, p: Pt): Pt {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / w,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / w,
  };
}

export function multiply(a: Mat3, b: Mat3): Mat3 {
  const r = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j]! += a[i * 3 + k]! * b[k * 3 + j]!;
  return r as Mat3;
}

/** The inverse by adjugate; null when the matrix is singular. */
export function invert(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const inv: Mat3 = [
    A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    C / det, -(a * h - b * g) / det, (a * e - b * d) / det,
  ];
  return inv;
}

export function applyAffine(m: Mat3, p: Pt): Pt {
  return { x: m[0] * p.x + m[1] * p.y + m[2], y: m[3] * p.x + m[4] * p.y + m[5] };
}

export function translation(x: number, y: number): Mat3 {
  return [1, 0, x, 0, 1, y, 0, 0, 1];
}

export function scaling(sx: number, sy = sx): Mat3 {
  return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
}

/** Rotation by `degrees`, clockwise on a y-down screen. */
export function rotation(degrees: number): Mat3 {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
