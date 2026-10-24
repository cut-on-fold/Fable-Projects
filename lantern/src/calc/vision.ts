// Finding things in a camera picture for automatic calibration: where a
// projected ring landed, and where the painted dot it should sit on is.
// Pure functions over pixel arrays (RGBA, row by row, like ImageData), so
// they can be tested with drawn pictures and copied elsewhere.
//
// The scheme: with the screen white, a small black ring is projected at a
// calibration point. A frame with the ring minus a frame without leaves
// only the ring, whatever is painted or lying on the mat, and its centroid
// is the ring's centre. The dot is the small orange patch nearest that
// centre in the plain white frame. The difference between the two, turned
// into screen pixels through the camera map, is how far to move the point.

import { applyHomography, solve, type Mat3, type Pt } from './homography';

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

export interface RingFound extends Blob {
  /** How much darker (in luma) a pixel had to get to count, chosen from the picture. */
  drop: number;
  /** The biggest darkening seen. */
  peak: number;
  /** How far the counted pixels sit from the centre on average (root mean square), in pixels: a ring's radius or so, far more for noise. */
  spread: number;
  /** The radius of the circle fitted to the ring, in pixels, or null if no circle fitted (then x, y is the plain centroid). */
  radius: number | null;
  /** How much of the circle the darkened pixels go round, 0–1: 1 for a whole ring, about 0.25 for the quarter left at a corner of the screen. */
  coverage: number;
}

/** Where to look: within `r` pixels of (x, y). */
export interface Near {
  x: number;
  y: number;
  r: number;
}

/**
 * The centroid of the pixels that got darker from `lit` to `ringed`: the
 * projected ring, with everything that did not change cancelled out. Null
 * if fewer than `minPixels` did.
 *
 * A projected "black" ring on a lit mat is only a shade darker than the
 * white around it (the room light still falls on it, and the camera sets
 * its own exposure), so there is no fixed amount of darkening to look for.
 * Instead the threshold follows the picture: a third of the darkening the
 * `minPixels`-th darkest pixel showed, never below `floor`, which keeps out
 * camera noise. A change in exposure between the two frames would darken
 * (or lighten) everything a little; the middle value of the change over the
 * whole piece is taken as that drift and subtracted first.
 *
 * Only the lit mat can show the ring, so pixels that were dark in `lit`
 * (a laptop, the table's edge, the floor) are left out: they flicker from
 * frame to frame and would otherwise be taken for darkening. And with
 * `near` given, only pixels within its reach count, the centre of the
 * search moving to the centroid found and looking again, a few times, so
 * that a speck of change elsewhere in the piece cannot pull the ring's
 * centre about or widen its spread.
 *
 * A circle is fitted to what darkened, so a ring cut off by the screen's
 * edge still gives its true centre. A short arc (a quarter ring at a
 * corner) cannot settle both the radius and the centre, so when less than
 * three quarters of the circle shows and `expectRadius` (the ring's radius
 * in this picture, known from how it is drawn and the camera's scale) is
 * given, the radius is held at that and only the centre is fitted.
 */
export function darkenedCentroid(lit: Frame, ringed: Frame, minPixels = 30, floor = 10, near?: Near, expectRadius?: number): RingFound | null {
  if (lit.width !== ringed.width || lit.height !== ringed.height) return null;
  const w = lit.width;
  const count = w * lit.height;
  const drops = new Int16Array(count);
  const litLuma = new Uint8Array(count);
  const hist = new Int32Array(511); // of drop + 255
  const lumaHist = new Int32Array(256);
  let cx = near?.x ?? w / 2;
  let cy = near?.y ?? lit.height / 2;
  const r = near?.r ?? Infinity;
  const within = (k: number): boolean => {
    if (r === Infinity) return true;
    const x = (k % w) + 0.5;
    const y = (k - (x - 0.5)) / w + 0.5;
    return Math.hypot(x - cx, y - cy) <= r;
  };
  let inReach = 0;
  for (let k = 0; k < count; k++) {
    const i = k * 4;
    const before = luma(lit.data[i]!, lit.data[i + 1]!, lit.data[i + 2]!);
    const after = luma(ringed.data[i]!, ringed.data[i + 1]!, ringed.data[i + 2]!);
    const d = Math.max(-255, Math.min(255, Math.round(before - after)));
    drops[k] = d;
    litLuma[k] = Math.round(before);
    hist[d + 255]!++;
    if (within(k)) {
      lumaHist[litLuma[k]!]!++;
      inReach++;
    }
  }
  let acc = 0;
  let drift = 0;
  for (let b = 0; b < 511; b++) {
    acc += hist[b]!;
    if (acc * 2 >= count) {
      drift = b - 255;
      break;
    }
  }
  // the mat is about as bright as the brightest twentieth of what is in reach; anything much darker is not mat
  acc = 0;
  let mat = 255;
  for (let b = 255; b >= 0; b--) {
    acc += lumaHist[b]!;
    if (acc * 20 >= inReach) {
      mat = b;
      break;
    }
  }
  const litEnough = mat * 0.7;
  const counts = (k: number): boolean => litLuma[k]! >= litEnough && within(k);
  hist.fill(0);
  for (let k = 0; k < count; k++) if (counts(k)) hist[drops[k]! + 255]!++;
  acc = 0;
  let top = 0;
  for (let b = 510; b >= 0; b--) {
    acc += hist[b]!;
    if (acc >= minPixels) {
      top = b - 255 - drift;
      break;
    }
  }
  const drop = Math.max(floor, top / 3);
  let n = 0;
  let spread = 0;
  let peak = 0;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const ws = new Float64Array(count);
  for (let pass = 0; pass < (r === Infinity ? 1 : 5); pass++) {
    let sx = 0;
    let sy = 0;
    let sw = 0;
    let sxx = 0;
    let syy = 0;
    n = 0;
    peak = 0;
    for (let k = 0; k < count; k++) {
      if (!counts(k)) continue;
      const d = drops[k]! - drift;
      if (d > peak) peak = d;
      if (d <= drop) continue;
      // centroids are of pixel centres, half a pixel in from the index
      const x = (k % w) + 0.5;
      const y = (k - (x - 0.5)) / w + 0.5;
      xs[n] = x;
      ys[n] = y;
      ws[n] = d;
      sx += x * d;
      sy += y * d;
      sxx += x * x * d;
      syy += y * y * d;
      sw += d;
      n++;
    }
    if (n < minPixels) return null;
    const nx = sx / sw;
    const ny = sy / sw;
    spread = Math.sqrt(Math.max(0, (sxx + syy) / sw - nx * nx - ny * ny));
    const moved = Math.hypot(nx - cx, ny - cy);
    cx = nx;
    cy = ny;
    if (moved < 0.05) break;
  }
  // A ring cut off by the screen's edge (a corner point) or by the mat's edge has its centroid pulled towards
  // the part that shows; a circle fitted to the pixels has its centre in the right place from any arc.
  const circle = fitCircle(xs, ys, ws, n, cx, cy, r === Infinity ? Math.min(w, lit.height) / 2 : r, expectRadius);
  if (!circle) return { x: cx, y: cy, n, drop, peak, spread, radius: null, coverage: 0 };
  // The mat glows: the projector's light travels a little way through it before coming back out, away from the
  // projector, so the dark ring is filled in on the side facing the projector and trails a shadow on the other.
  // Every darkened pixel, weighted by how dark, then leans away from the projector by a pixel or so, which on
  // the mat is a millimetre or two. The glow is a slow slope laid over the ring; the ring's own two edges are
  // still the sharpest changes in the picture and stay where they are, so the circle is refitted to them.
  const h = lit.height;
  const sample = (x: number, y: number): number | null => {
    // bilinear, over pixel centres; null where any corner is off the lit mat or out of reach
    const x0 = Math.floor(x - 0.5);
    const y0 = Math.floor(y - 0.5);
    if (x0 < 0 || y0 < 0 || x0 + 1 >= w || y0 + 1 >= h) return null;
    const fx = x - 0.5 - x0;
    const fy = y - 0.5 - y0;
    let v = 0;
    for (const [dx, dy, wt] of [
      [0, 0, (1 - fx) * (1 - fy)],
      [1, 0, fx * (1 - fy)],
      [0, 1, (1 - fx) * fy],
      [1, 1, fx * fy],
    ] as const) {
      const k = (y0 + dy) * w + x0 + dx;
      if (!counts(k)) return null;
      v += wt * (drops[k]! - drift);
    }
    return v;
  };
  const edged = edgeCircle(sample, circle, drop, expectRadius);
  return { x: edged.x, y: edged.y, n, drop, peak, spread, radius: edged.radius, coverage: circle.coverage };
}

/**
 * The circle through the middle of the ring's two edges. From the centre
 * of `circle`, along every 5°, the darkening is sampled across the ring;
 * the ring's inner edge is where it climbs steepest going outward and the
 * outer edge where it falls steepest, each to a fraction of a pixel from
 * the curve through the steepest step and its neighbours, and the point
 * midway between the two is the ring's middle there. A circle is fitted
 * to those points, the radius held at `expectRadius` as in `fitCircle`
 * when under three quarters of the ring shows. A direction without two
 * clear edges (the ring cut off there, under something, or too faint)
 * gives no point; with too few points the circle given is returned as it
 * was. The glow a translucent mat adds is a slow slope across the ring
 * and a tail beyond it, far gentler than the ring's own edges, so it
 * leaves them where they are while it pulls any weighted average about.
 */
function edgeCircle(
  sample: (x: number, y: number) => number | null,
  circle: { x: number; y: number; radius: number; coverage: number },
  drop: number,
  expectRadius?: number,
): { x: number; y: number; radius: number; coverage: number } {
  const steps = 72;
  const xs = new Float64Array(steps);
  const ys = new Float64Array(steps);
  const ws = new Float64Array(steps);
  let n = 0;
  const { radius } = circle;
  const from = radius * 0.5;
  const step = 0.5;
  const count = Math.round(radius / step) + 1; // out to 1.5 radii
  const steep = drop / 2; // per pixel: an edge must climb at least this much, a glow's slope never does
  /** Where the slope through `i` peaks, to a fraction of a step, by the parabola through its neighbours. */
  const peakAt = (g: Float64Array, i: number): number => {
    const a = g[i - 1];
    const b = g[i];
    const c = g[i + 1];
    if (a === undefined || c === undefined || !Number.isFinite(a) || !Number.isFinite(c)) return i;
    const denom = a - 2 * b! + c;
    return denom < 0 ? i + (a - c) / (2 * denom) : i;
  };
  const profile = new Float64Array(count);
  const slope = new Float64Array(count);
  for (let s = 0; s < steps; s++) {
    const angle = (s / steps) * 2 * Math.PI;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    for (let i = 0; i < count; i++) {
      const d = from + i * step;
      profile[i] = sample(circle.x + ux * d, circle.y + uy * d) ?? NaN;
    }
    // the slope going outward, per pixel, over half a pixel either side: a short span, so a glow's gentle slope
    // or tail beside an edge does not lean on where the edge is found
    slope.fill(NaN);
    for (let i = 1; i < count - 1; i++) slope[i] = (profile[i + 1]! - profile[i - 1]!) / (2 * step);
    // the inner edge climbs (into the ring), inside the circle's radius; the outer edge falls, outside it
    const mid = Math.round((radius - from) / step);
    let inner = -1;
    let outer = -1;
    for (let i = 2; i < count - 2; i++) {
      const g = slope[i]!;
      if (!Number.isFinite(g)) continue;
      if (i <= mid && g >= steep && (inner < 0 || g > slope[inner]!)) inner = i;
      if (i >= mid && -g >= steep && (outer < 0 || g < slope[outer]!)) outer = i;
    }
    if (inner < 0 || outer < 0) continue;
    const dIn = from + peakAt(slope, inner) * step;
    const dOut = from + peakAt(slope, outer) * step;
    if (dOut - dIn < step * 2) continue;
    const d = (dIn + dOut) / 2;
    xs[n] = circle.x + ux * d;
    ys[n] = circle.y + uy * d;
    ws[n] = 1;
    n++;
  }
  if (n < 8) return circle;
  const c = { a: circle.x, b: circle.y, rad: radius };
  const fixed = n / steps < 0.75 && expectRadius !== undefined && expectRadius > 0;
  if (fixed) c.rad = expectRadius;
  let keep: (k: number) => boolean = () => true;
  if (!refine(xs, ys, ws, n, keep, c, fixed)) return circle;
  // once more without any point far from the circle (a speck, or where the ring is cut off)
  keep = (k) => Math.abs(Math.hypot(xs[k]! - c.a, ys[k]! - c.b) - c.rad) <= 0.15 * c.rad;
  let kept = 0;
  for (let k = 0; k < n; k++) if (keep(k)) kept++;
  if (kept < 8 || !refine(xs, ys, ws, n, keep, c, fixed)) return circle;
  if (!Number.isFinite(c.a) || !Number.isFinite(c.b) || Math.hypot(c.a - circle.x, c.b - circle.y) > radius) return circle;
  return { x: c.a, y: c.b, radius: c.rad, coverage: circle.coverage };
}

/** The camera's scale at a screen point: camera pixels per screen pixel, from the slope of the map there. */
export function localScale(h: Mat3, screen: Pt): number {
  const eps = 1;
  const c0 = applyHomography(h, screen);
  const cx = applyHomography(h, { x: screen.x + eps, y: screen.y });
  const cy = applyHomography(h, { x: screen.x, y: screen.y + eps });
  const det = (cx.x - c0.x) * (cy.y - c0.y) - (cy.x - c0.x) * (cx.y - c0.y);
  return Number.isFinite(det) ? Math.sqrt(Math.abs(det)) : 0;
}

/** How much of a circle the points go round: the share of 10° sectors about (a, b) that have a point in them. */
function coverageOf(xs: Float64Array, ys: Float64Array, n: number, keep: (k: number) => boolean, a: number, b: number): number {
  const bins = new Uint8Array(36);
  for (let k = 0; k < n; k++) {
    if (!keep(k)) continue;
    const angle = Math.atan2(ys[k]! - b, xs[k]! - a);
    bins[Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 36) % 36] = 1;
  }
  let filled = 0;
  for (const bin of bins) filled += bin;
  return filled / 36;
}

/** Gauss–Newton on the true distances: fit the centre, and the radius too unless `fixed`. Returns false if the equations fail. */
function refine(xs: Float64Array, ys: Float64Array, ws: Float64Array, n: number, keep: (k: number) => boolean, c: { a: number; b: number; rad: number }, fixed: boolean): boolean {
  const dims = fixed ? 2 : 3;
  for (let round = 0; round < 8; round++) {
    const m = Array.from({ length: dims }, () => new Array<number>(dims).fill(0));
    const v = new Array<number>(dims).fill(0);
    for (let k = 0; k < n; k++) {
      if (!keep(k)) continue;
      const dx = xs[k]! - c.a;
      const dy = ys[k]! - c.b;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue;
      const wt = ws[k]!;
      const j = [-dx / dist, -dy / dist, -1];
      const res = dist - c.rad;
      for (let p = 0; p < dims; p++) {
        v[p]! -= wt * j[p]! * res;
        for (let q = 0; q < dims; q++) m[p]![q]! += wt * j[p]! * j[q]!;
      }
    }
    const step = solve(m, v);
    if (!step) return false;
    c.a += step[0]!;
    c.b += step[1]!;
    if (!fixed) c.rad += step[2]!;
    if (Math.hypot(step[0]!, step[1]!) < 1e-4) break;
  }
  return true;
}

/**
 * The circle through weighted points (Kåsa's fit: the least squares of
 * x² + y² + Dx + Ey + F), done twice, the second time only with the
 * points within 35% of the first radius so that specks inside or outside
 * the ring do not count. Null if the points do not make a circle, or its
 * centre is further than `reach` from (cx, cy), or its radius is silly.
 */
function fitCircle(xs: Float64Array, ys: Float64Array, ws: Float64Array, n: number, cx: number, cy: number, reach: number, expectRadius?: number): { x: number; y: number; radius: number; coverage: number } | null {
  // Kåsa's fit, a linear least squares, as the starting point
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  let sx = 0;
  let sy = 0;
  let s = 0;
  let sxz = 0;
  let syz = 0;
  let sz = 0;
  for (let k = 0; k < n; k++) {
    // about the centroid, so the numbers stay small
    const x = xs[k]! - cx;
    const y = ys[k]! - cy;
    const wt = ws[k]!;
    const z = x * x + y * y;
    sxx += wt * x * x;
    sxy += wt * x * y;
    syy += wt * y * y;
    sx += wt * x;
    sy += wt * y;
    s += wt;
    sxz += wt * x * z;
    syz += wt * y * z;
    sz += wt * z;
  }
  const sol = solve(
    [
      [sxx, sxy, sx],
      [sxy, syy, sy],
      [sx, sy, s],
    ],
    [-sxz, -syz, -sz],
  );
  if (!sol) return null;
  const [d, e, f] = sol as [number, number, number];
  const c = { a: -d / 2 + cx, b: -e / 2 + cy, rad: Math.sqrt(Math.max(0, (d * d + e * e) / 4 - f)) };
  const sane = () => Number.isFinite(c.rad) && c.rad >= 2 && c.rad <= reach && Math.hypot(c.a - cx, c.b - cy) <= reach;
  if (!sane()) return null;
  // Kåsa's fit leans towards the inside of a thick arc, and a quarter arc badly: a few rounds of Gauss–Newton on
  // the true distances put it right. First with every pixel, then only with those within 35% of the radius, so
  // specks inside or outside the ring do not count.
  let keep: (k: number) => boolean = () => true;
  const band = () => {
    const { a, b, rad } = c;
    keep = (k) => Math.abs(Math.hypot(xs[k]! - a, ys[k]! - b) - rad) <= 0.35 * rad;
  };
  for (let pass = 0; pass < 2; pass++) {
    if (!refine(xs, ys, ws, n, keep, c, false)) return null;
    if (!sane()) return null;
    band();
  }
  let coverage = coverageOf(xs, ys, n, keep, c.a, c.b);
  // A short arc cannot settle the radius and the centre together: with the radius known, hold it and fit the centre.
  if (coverage < 0.75 && expectRadius && expectRadius > 0) {
    c.rad = expectRadius;
    band();
    for (let pass = 0; pass < 2; pass++) {
      if (!refine(xs, ys, ws, n, keep, c, true)) return null;
      if (!sane()) return null;
      band();
    }
    coverage = coverageOf(xs, ys, n, keep, c.a, c.b);
  }
  return { x: c.a, y: c.b, radius: c.rad, coverage };
}

/**
 * How orange a pixel is, 0 for white, grey, blue, pink, pencil, red and
 * yellow, rising with the paint. It goes by hue: with red the biggest of
 * the three, how far green sits from blue towards red puts the hue between
 * 0° (red) and 60° (yellow). Orange paint and orange vinyl sit around
 * 20°–30°, a red-orange dot about 14°, a red or pink mat line under the
 * projector's light at 0°–5° (its green no higher than its blue), a golden
 * yellow over 40°. The score is the colourfulness (red over blue) inside a
 * window of 14°–34°, fading to nothing by 6° and 40°, and fading out for
 * anything dark (a wooden table's edge is brown, which is a dim orange).
 * Soft, so a dot a few pixels wide and blurred at the edges still scores
 * where a hard yes-or-no test on each pixel would find nothing.
 */
export function orangeScore(r: number, g: number, b: number): number {
  const chroma = r - b;
  if (chroma <= 0 || g < b || g > r) return 0;
  const hue = (60 * (g - b)) / chroma;
  const window = hue < 6 ? 0 : hue < 14 ? (hue - 6) / 8 : hue <= 34 ? 1 : hue < 40 ? (40 - hue) / 6 : 0;
  const bright = Math.max(0, Math.min(1, (r - 120) / 40));
  return chroma * window * bright;
}

export interface DotFound {
  /** The middle of the orange patch, in frame pixels: every pixel of it counts the same, however bright. */
  x: number;
  y: number;
  /** Pixels in the patch, holes filled. */
  n: number;
  /** The best score seen, for the diagnostics. */
  peak: number;
  /** How far the patch's pixels sit from the centre on average (root mean square), in pixels: a pixel or two for a dot, tens for a line. */
  spread: number;
}

/**
 * The dot within `reach` of `centre`: the middle of the patch of orange
 * there, or null if it has fewer than `minPixels` pixels. The patch is the
 * run of touching pixels, each scoring at least `minScore` and at least
 * half the best score in reach, that contains that best pixel: so a
 * reddish mat line through the dot, scoring but well under the paint, is
 * not part of it, and a fainter orange nearby that does not touch it
 * cannot pull its centre about. `spread` says how big the patch is, for
 * the caller to refuse anything but a small, compact dot. A single dot is
 * all that is expected within reach (dots are 15 cm apart and reach is a
 * few cm), so no attempt is made to tell two apart.
 *
 * The middle is the plain centroid of the patch, each pixel counting once
 * whatever its score, with any hole inside it filled in. A dot on the mat
 * is lit more strongly on the side facing the projector, and a glossy one
 * can throw a white glint there; weighting pixels by how bright and orange
 * they are, or dropping the ones a glint has bleached, pulls the measured
 * centre towards that side by a pixel or so, which on the mat is a couple
 * of millimetres, the same way at every point. The shape of the patch does
 * not move with the light. (A side of the dot so dull it scores under half
 * the best is still left out, as a line would be.)
 */
export function dotNear(frame: Frame, centre: Pt, reach: number, minScore = 25, minPixels = 2): DotFound | null {
  const { width: w, height: h, data } = frame;
  const x0 = Math.max(0, Math.floor(centre.x - reach));
  const x1 = Math.min(w - 1, Math.ceil(centre.x + reach));
  const y0 = Math.max(0, Math.floor(centre.y - reach));
  const y1 = Math.min(h - 1, Math.ceil(centre.y + reach));
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  if (cols <= 0 || rows <= 0) return null;
  // 0 outside reach or under the score, 1 orange, 2 in the dot's patch, 3 blank but reachable from the window's edge,
  // 4 a hole in the dot's patch, 5 blank but walled in by some other orange
  const cell = new Uint8Array(cols * rows);
  const scores = new Float32Array(cols * rows);
  let peak = 0;
  let top = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (Math.hypot(x + 0.5 - centre.x, y + 0.5 - centre.y) > reach) continue;
      const i = (y * w + x) * 4;
      const sc = orangeScore(data[i]!, data[i + 1]!, data[i + 2]!);
      const k = (y - y0) * cols + (x - x0);
      scores[k] = sc;
      if (sc > peak) {
        peak = sc;
        top = k;
      }
    }
  }
  if (top < 0 || peak < minScore) return null;
  // only pixels at least half as orange as the best count, so a reddish mat line through the dot is not part of it
  const threshold = Math.max(minScore, peak / 2);
  for (let k = 0; k < cell.length; k++) if (scores[k]! >= threshold) cell[k] = 1;
  // Flood from `start` over touching cells valued `from`, setting them to `to`; true if the flood touched a cell valued `edge`.
  const fill = (start: number, from: number, to: number, edge: number): boolean => {
    const stack = [start];
    cell[start] = to;
    let touched = false;
    while (stack.length) {
      const k = stack.pop()!;
      const kx = k % cols;
      const ky = (k - kx) / cols;
      const step = (nx: number, ny: number) => {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
        const nk = ny * cols + nx;
        const c = cell[nk];
        if (c === edge) touched = true;
        if (c !== from) return;
        cell[nk] = to;
        stack.push(nk);
      };
      step(kx - 1, ky);
      step(kx + 1, ky);
      step(kx, ky - 1);
      step(kx, ky + 1);
    }
    return touched;
  };
  // grow the patch from the most orange pixel over touching orange pixels
  fill(top, 1, 2, -1);
  // blank cells that can be reached from the window's edge are outside the patch
  for (let x = 0; x < cols; x++) {
    if (cell[x] === 0) fill(x, 0, 3, -1);
    const k = (rows - 1) * cols + x;
    if (cell[k] === 0) fill(k, 0, 3, -1);
  }
  for (let y = 0; y < rows; y++) {
    const l = y * cols;
    if (cell[l] === 0) fill(l, 0, 3, -1);
    const r = l + cols - 1;
    if (cell[r] === 0) fill(r, 0, 3, -1);
  }
  // what is left blank is walled in: a hole in the dot's patch if only the patch walls it, else someone else's
  for (let k = 0; k < cell.length; k++) {
    if (cell[k] === 0) {
      const other = fill(k, 0, 4, 1);
      if (other) fill(k, 4, 5, -1);
    }
  }
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let n = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cell[y * cols + x];
      if (c !== 2 && c !== 4) continue; // the patch, and the holes in it
      const px = x0 + x + 0.5;
      const py = y0 + y + 0.5;
      sx += px;
      sy += py;
      sxx += px * px;
      syy += py * py;
      n++;
    }
  }
  if (n < minPixels) return null;
  const cx = sx / n;
  const cy = sy / n;
  const spread = Math.sqrt(Math.max(0, (sxx + syy) / n - cx * cx - cy * cy));
  return { x: cx, y: cy, n, peak, spread };
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
