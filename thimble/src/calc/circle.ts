// Circle skirts: waist radius, outer radius, hem length and fabric needed.
// All lengths in cm. `fraction` is the share of a full circle: 1 for a full
// circle skirt, 0.5 for a half, 0.75, 0.25, 2 for a double circle.

export interface CircleInput {
  waist: number;
  ease: number;
  fraction: number;
  length: number;
  waistAllowance: number;
  hemAllowance: number;
  /** Seam allowance on the straight edges when the skirt is cut in panels. */
  seamAllowance: number;
  fabricWidth: number;
}

export interface CircleResult {
  /** Radius to the waist stitching line. */
  waistRadius: number;
  /** Radius to the waist cut edge (waist allowance taken off). */
  waistCutRadius: number;
  /** Radius to the hem cut edge. */
  outerRadius: number;
  /** Finished hem circumference. */
  hemLength: number;
  /** Quarter-circle panels the skirt is cut as, or 0 when cut in one piece. */
  panels: number;
  /** Quarter panels that fit side by side across the fabric. */
  across: number;
  /** Fabric length needed, or null when a panel is wider than the fabric. */
  fabricLength: number | null;
  onePiece: boolean;
}

export function circleSkirt(i: CircleInput): CircleResult | null {
  if (!(i.waist > 0) || !(i.fraction > 0) || !(i.length >= 0)) return null;
  const waistRadius = (i.waist + i.ease) / (2 * Math.PI * i.fraction);
  const waistCutRadius = Math.max(0, waistRadius - i.waistAllowance);
  const outerRadius = waistRadius + i.length + i.hemAllowance;
  const hemLength = 2 * Math.PI * i.fraction * (waistRadius + i.length);

  const panels = Math.ceil(i.fraction * 4 - 1e-9);
  const W = i.fabricWidth;
  if (!(W > 0)) {
    return { waistRadius, waistCutRadius, outerRadius, hemLength, panels, across: 0, fabricLength: null, onePiece: false };
  }

  // A full circle cut on a double fold needs a square 2R on a side.
  if (Math.abs(i.fraction - 1) < 1e-9 && W >= 2 * outerRadius) {
    return { waistRadius, waistCutRadius, outerRadius, hemLength, panels: 0, across: 1, fabricLength: 2 * outerRadius, onePiece: true };
  }
  // A half circle cut on a single fold needs a piece 2R by R.
  if (Math.abs(i.fraction - 0.5) < 1e-9 && W >= outerRadius) {
    return { waistRadius, waistCutRadius, outerRadius, hemLength, panels: 0, across: 1, fabricLength: 2 * outerRadius, onePiece: true };
  }
  const panel = outerRadius + i.seamAllowance;
  const across = Math.floor(W / panel + 1e-9);
  if (across === 0) {
    return { waistRadius, waistCutRadius, outerRadius, hemLength, panels, across: 0, fabricLength: null, onePiece: false };
  }
  const rows = Math.ceil(panels / across);
  return { waistRadius, waistCutRadius, outerRadius, hemLength, panels, across, fabricLength: rows * panel, onePiece: false };
}
