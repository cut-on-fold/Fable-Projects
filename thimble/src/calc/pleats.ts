// Pleats: fabric needed for a run of pleats and where to mark the folds.
// All lengths in cm.

export type PleatStyle = 'knife' | 'box' | 'inverted';

export interface PleatInput {
  style: PleatStyle;
  /** Finished width of the pleated section (what you see when it is sewn). */
  finishedWidth: number;
  /** Width of each pleat's face: the spacing between pleats. */
  pleatWidth: number;
  /** Depth of the fold under each pleat. Equal to the pleat width for a 1:3 pleat. */
  depth: number;
  /** Allowance at each end of the run. */
  endAllowance: number;
}

export interface PleatMark {
  position: number;
  kind: 'fold' | 'placement';
}

export interface PleatResult {
  count: number;
  /** Fabric used by the pleats themselves. */
  pleated: number;
  /** Cut width, end allowances included. */
  cutWidth: number;
  /** Fabric to finished width. */
  ratio: number;
  /** Marks along the cut edge from the left end. Fold lines fold to placement lines. */
  marks: PleatMark[];
}

export function pleats(i: PleatInput): PleatResult | null {
  if (!(i.finishedWidth > 0) || !(i.pleatWidth > 0) || !(i.depth >= 0) || i.endAllowance < 0) return null;
  const count = Math.max(1, Math.round(i.finishedWidth / i.pleatWidth));
  // A knife pleat tucks 2 × depth behind each face. Box and inverted pleats
  // tuck depth on each side, which is the same amount of fabric.
  const pleated = i.finishedWidth + count * 2 * i.depth;
  const cutWidth = pleated + 2 * i.endAllowance;
  const ratio = pleated / i.finishedWidth;

  const marks: PleatMark[] = [];
  const face = i.finishedWidth / count;
  let x = i.endAllowance;
  for (let k = 0; k < count; k++) {
    if (i.style === 'knife') {
      // Face, then the fold goes back by depth and returns to a placement line.
      x += face;
      marks.push({ position: x, kind: 'fold' });
      x += 2 * i.depth;
      marks.push({ position: x, kind: 'placement' });
    } else if (i.style === 'box') {
      // Underlap on each side of the face: placement, fold, face, fold, placement.
      marks.push({ position: x, kind: 'placement' });
      x += i.depth;
      marks.push({ position: x, kind: 'fold' });
      x += face;
      marks.push({ position: x, kind: 'fold' });
      x += i.depth;
      marks.push({ position: x, kind: 'placement' });
    } else {
      // Inverted: the folds meet in the middle of the face.
      marks.push({ position: x, kind: 'fold' });
      x += i.depth;
      marks.push({ position: x, kind: 'placement' });
      x += face;
      marks.push({ position: x, kind: 'placement' });
      x += i.depth;
      marks.push({ position: x, kind: 'fold' });
    }
  }
  if (i.style === 'knife' && marks.length) marks.pop(); // the last pleat has nowhere to fold to beyond the run
  return { count, pleated, cutWidth, ratio, marks };
}
