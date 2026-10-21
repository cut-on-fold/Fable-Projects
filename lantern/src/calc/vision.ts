// Finding things in a camera picture for automatic calibration: where a
// projected ring landed, and where the painted dot it should sit on is.
// Pure functions over pixel arrays (RGBA, row by row, like ImageData), so
// they can be tested with drawn pictures and copied elsewhere.
//
// The scheme: with the screen white, a small black ring is projected at a
// calibration point. A frame with the ring minus a frame without leaves
// only the ring, whatever is painted or lying on the mat, and its centroid
// is the ring's centre. The dot is the orange patch nearest that centre in
// the plain white frame. The difference between the two, turned into screen
// pixels through the camera map, is how far to move the point.

import { applyHomography, type Mat3, type Pt } from './homography';

export interface Frame {
  width: number;
  height: number;
  /** RGBA, 4 bytes a pixel. */
  data: Uint8ClampedArray;
}

export interface Blob {
  /** Centroid, in frame pixels, measured at pixel centres (so a one-pixel blob at index 3 is at 3.5). */
  x: number;
  y: number;
  /** Pixels in it. */
  n: number;
}

/** Perceived brightness, 0–255. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * An orange acrylic dot under white light: red well above blue, green well
 * above blue but below red. Pink and red mat lines fail on green, yellow
 * tools fail on red-minus-green, blue lines and pencil fail on everything.
 */
export function isOrange(r: number, g: number, b: number): boolean {
  return r > 120 && r - b > 70 && r - g > 30 && g - b > 20;
}

/**
 * The centroid of the pixels that got darker from `lit` to `ringed` by more
 * than `drop`: the projected ring, with everything that did not change
 * cancelled out. Null if fewer than `minPixels` changed.
 */
export function darkenedCentroid(lit: Frame, ringed: Frame, drop = 40, minPixels = 30): Blob | null {
  if (lit.width !== ringed.width || lit.height !== ringed.height) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  const w = lit.width;
  for (let y = 0; y < lit.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const before = luma(lit.data[i]!, lit.data[i + 1]!, lit.data[i + 2]!);
      const after = luma(ringed.data[i]!, ringed.data[i + 1]!, ringed.data[i + 2]!);
      if (before - after > drop) {
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  // centroids are of pixel centres, half a pixel in from the index
  return n >= minPixels ? { x: sx / n + 0.5, y: sy / n + 0.5, n } : null;
}

/** Connected patches of orange pixels (4-neighbour), at least `minPixels` each, largest first. */
export function orangeBlobs(frame: Frame, minPixels = 3): Blob[] {
  const { width: w, height: h, data } = frame;
  const seen = new Uint8Array(w * h);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const i0 = start * 4;
    if (!isOrange(data[i0]!, data[i0 + 1]!, data[i0 + 2]!)) {
      seen[start] = 1;
      continue;
    }
    let sx = 0;
    let sy = 0;
    let n = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      sx += x;
      sy += y;
      n++;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || seen[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === w - 1)) continue;
        const iq = q * 4;
        if (isOrange(data[iq]!, data[iq + 1]!, data[iq + 2]!)) {
          seen[q] = 1;
          stack.push(q);
        } else seen[q] = 1;
      }
    }
    if (n >= minPixels) blobs.push({ x: sx / n + 0.5, y: sy / n + 0.5, n });
  }
  return blobs.sort((a, b) => b.n - a.n);
}

/** The blob nearest `p` within `maxDist` pixels, or null. */
export function nearestBlob(blobs: Blob[], p: Pt, maxDist: number): Blob | null {
  let best: Blob | null = null;
  let bestD = maxDist;
  for (const b of blobs) {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d <= bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

/**
 * How far to move a screen point so that its projection lands where the
 * dot is: the camera-pixel gap from `ring` to `dot`, taken back to screen
 * pixels through the slope of the screen-to-camera map `h` at `screen`.
 * The map is only roughly right (four clicked corners, a lens that bends),
 * so the answer is a step towards the dot, to be repeated, not a jump to it.
 */
export function correction(h: Mat3, screen: Pt, ring: Pt, dot: Pt): Pt {
  const eps = 1;
  const c0 = applyHomography(h, screen);
  const cx = applyHomography(h, { x: screen.x + eps, y: screen.y });
  const cy = applyHomography(h, { x: screen.x, y: screen.y + eps });
  // columns of the 2 × 2 slope: camera change per screen pixel in x and in y
  const a = (cx.x - c0.x) / eps;
  const c = (cx.y - c0.y) / eps;
  const b = (cy.x - c0.x) / eps;
  const d = (cy.y - c0.y) / eps;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return { x: 0, y: 0 };
  const gx = dot.x - ring.x;
  const gy = dot.y - ring.y;
  return { x: (d * gx - b * gy) / det, y: (a * gy - c * gx) / det };
}

/** A frame with every pixel white, for tests and for a plain background to draw on. */
export function blankFrame(width: number, height: number, rgb: [number, number, number] = [255, 255, 255]): Frame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return { width, height, data };
}

/** Paint a filled disc or a ring (inner radius `hole`) onto a frame, for tests. */
export function paintDisc(frame: Frame, cx: number, cy: number, radius: number, rgb: [number, number, number], hole = 0): void {
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(frame.height - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(frame.width - 1, Math.ceil(cx + radius)); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= radius && d >= hole) {
        const i = (y * frame.width + x) * 4;
        frame.data[i] = rgb[0];
        frame.data[i + 1] = rgb[1];
        frame.data[i + 2] = rgb[2];
      }
    }
  }
}
