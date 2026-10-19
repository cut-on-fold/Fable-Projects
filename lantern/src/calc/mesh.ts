// The calibration mesh: where each point of the table lands on the screen.
//
// The table is a rectangle of `width` × `height` cm with its origin at the
// top-left corner. The mesh has a point at every crossing of the column
// positions `xs` and the row positions `ys` (cm from that corner, starting
// at 0 and ending at the far edge), and keeps one screen point per
// crossing: where that spot on the table has to be drawn so that the
// projector puts it in the right place. The positions are whatever is easy
// to find on the mat, every 6 in say, with the last cell shorter if the mat
// is not a multiple.
//
// The four corners fix a homography, the same model Pattern Projector uses,
// which is exact for a flat table at any tilt. Every other point is kept as
// a nudge away from where that homography would put it, and the nudges are
// blended bilinearly inside each cell. So adding points changes nothing
// until one is moved, and dragging an inner point bends the picture locally:
// a dip in the desk, a bulge in a cheap lens, a floor that is not quite a
// plane.

import { applyHomography, homographyFromPoints, invert, rectCorners, type Mat3, type Pt } from './homography';

export interface Mesh {
  /** Table size in cm. */
  width: number;
  height: number;
  /** Column positions in cm from the left edge: 0 first, width last. */
  xs: number[];
  /** Row positions in cm from the top edge: 0 first, height last. */
  ys: number[];
  /** One screen point per crossing, row by row from the top-left. */
  points: Pt[];
}

export function cols(mesh: Pick<Mesh, 'xs'>): number {
  return mesh.xs.length - 1;
}

export function rows(mesh: Pick<Mesh, 'ys'>): number {
  return mesh.ys.length - 1;
}

export function pointIndex(mesh: Pick<Mesh, 'xs'>, i: number, j: number): number {
  return j * mesh.xs.length + i;
}

export function pointAt(mesh: Mesh, i: number, j: number): Pt {
  return mesh.points[pointIndex(mesh, i, j)]!;
}

/** The table position (cm) that crossing (i, j) stands for. */
export function tablePointAt(mesh: Mesh, i: number, j: number): Pt {
  return { x: mesh.xs[i]!, y: mesh.ys[j]! };
}

export function corners(mesh: Mesh): [Pt, Pt, Pt, Pt] {
  const c = cols(mesh);
  const r = rows(mesh);
  return [pointAt(mesh, 0, 0), pointAt(mesh, c, 0), pointAt(mesh, c, r), pointAt(mesh, 0, r)];
}

export function isCornersOnly(mesh: Mesh): boolean {
  return cols(mesh) === 1 && rows(mesh) === 1;
}

/**
 * Positions every `step` cm along a length, from 0 to the far edge. The
 * last cell is whatever is left over; if that is less than a third of a
 * step it is folded into the cell before, so no point lands a sliver from
 * the edge.
 */
export function stops(length: number, step: number): number[] {
  if (!(length > 0)) return [0, Math.max(length, 0)];
  if (!(step > 0) || step >= length) return [0, length];
  const out: number[] = [];
  for (let k = 0; k * step < length - 1e-9; k++) out.push(Math.round(k * step * 1e6) / 1e6);
  const last = out[out.length - 1]!;
  if (out.length > 1 && length - last < step / 3) out.pop();
  out.push(length);
  return out;
}

/** A one-cell mesh from the four corners: top-left, top-right, bottom-right, bottom-left. */
export function meshFromCorners(width: number, height: number, c: readonly Pt[]): Mesh {
  if (c.length !== 4) throw new Error('four corners');
  return { width, height, xs: [0, width], ys: [0, height], points: [c[0]!, c[1]!, c[3]!, c[2]!] };
}

/** The homography table → screen through the mesh's corners (null if they are degenerate). */
export function cornerHomography(mesh: Mesh): Mat3 | null {
  return homographyFromPoints(rectCorners(mesh.width, mesh.height), corners(mesh));
}

interface Solved {
  h: Mat3 | null;
  inv: Mat3 | null;
  /** Each point's nudge away from the homography, in screen px. */
  nudges: Pt[];
}

// Meshes are never mutated, so the solved homography and nudges can be kept per object.
const solvedCache = new WeakMap<Mesh, Solved>();

function solved(mesh: Mesh): Solved {
  let s = solvedCache.get(mesh);
  if (s) return s;
  const h = cornerHomography(mesh);
  const inv = h && invert(h);
  const n = mesh.xs.length;
  const nudges = mesh.points.map((p, k) => {
    if (!h) return { x: 0, y: 0 };
    const base = applyHomography(h, tablePointAt(mesh, k % n, Math.floor(k / n)));
    return { x: p.x - base.x, y: p.y - base.y };
  });
  s = { h, inv, nudges };
  solvedCache.set(mesh, s);
  return s;
}

/** The cell index along one axis for a position, clamped to the cells there are, and the fraction across it. */
function along(positions: number[], v: number): { i: number; u: number } {
  const n = positions.length - 1;
  let i = 0;
  while (i < n - 1 && v >= positions[i + 1]!) i++;
  const a = positions[i]!;
  const b = positions[i + 1]!;
  return { i, u: b > a ? (v - a) / (b - a) : 0 };
}

function cellOf(mesh: Mesh, p: Pt): { i: number; j: number; u: number; v: number } {
  const x = along(mesh.xs, p.x);
  const y = along(mesh.ys, p.y);
  return { i: x.i, j: y.i, u: x.u, v: y.u };
}

/** The blended nudge at a table point: bilinear over the cell it is in (the nearest cell carries on outside). */
function nudgeAt(mesh: Mesh, nudges: Pt[], p: Pt): Pt {
  const { i, j, u, v } = cellOf(mesh, p);
  const n00 = nudges[pointIndex(mesh, i, j)]!;
  const n10 = nudges[pointIndex(mesh, i + 1, j)]!;
  const n01 = nudges[pointIndex(mesh, i, j + 1)]!;
  const n11 = nudges[pointIndex(mesh, i + 1, j + 1)]!;
  const a = (1 - u) * (1 - v);
  const b = u * (1 - v);
  const c = (1 - u) * v;
  const d = u * v;
  return { x: a * n00.x + b * n10.x + c * n01.x + d * n11.x, y: a * n00.y + b * n10.y + c * n01.y + d * n11.y };
}

/** Where a table point (cm) lands on the screen. Outside the table the map carries on past the edge. */
export function tableToScreen(mesh: Mesh, p: Pt): Pt {
  const s = solved(mesh);
  if (!s.h) {
    // Degenerate corners: fall back to the plain bilinear blend of the points so the handles can still be dragged apart.
    const { i, j, u, v } = cellOf(mesh, p);
    const p00 = pointAt(mesh, i, j);
    const p10 = pointAt(mesh, i + 1, j);
    const p01 = pointAt(mesh, i, j + 1);
    const p11 = pointAt(mesh, i + 1, j + 1);
    return {
      x: (1 - u) * (1 - v) * p00.x + u * (1 - v) * p10.x + (1 - u) * v * p01.x + u * v * p11.x,
      y: (1 - u) * (1 - v) * p00.y + u * (1 - v) * p10.y + (1 - u) * v * p01.y + u * v * p11.y,
    };
  }
  const base = applyHomography(s.h, p);
  if (isCornersOnly(mesh)) return base;
  const n = nudgeAt(mesh, s.nudges, p);
  return { x: base.x + n.x, y: base.y + n.y };
}

/**
 * The table point (cm) under a screen point: the inverse of tableToScreen.
 * The homography's inverse is the first guess; Newton's method with a
 * numerical Jacobian then takes the nudges into account.
 */
export function screenToTable(mesh: Mesh, p: Pt): Pt {
  const s = solved(mesh);
  if (!s.inv) return { x: NaN, y: NaN };
  let t = applyHomography(s.inv, p);
  if (isCornersOnly(mesh)) return t;
  const eps = 0.01;
  for (let n = 0; n < 25; n++) {
    const f = tableToScreen(mesh, t);
    const rx = f.x - p.x;
    const ry = f.y - p.y;
    if (Math.abs(rx) < 1e-6 && Math.abs(ry) < 1e-6) break;
    const fx = tableToScreen(mesh, { x: t.x + eps, y: t.y });
    const fy = tableToScreen(mesh, { x: t.x, y: t.y + eps });
    const a = (fx.x - f.x) / eps;
    const b = (fy.x - f.x) / eps;
    const c = (fx.y - f.y) / eps;
    const d = (fy.y - f.y) / eps;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12) break;
    t = { x: t.x - (d * rx - b * ry) / det, y: t.y - (a * ry - c * rx) / det };
  }
  return t;
}

/**
 * The same map sampled at new column and row positions. A point that is
 * already there stays where it is when the new grid lands on it;
 * everything else is read off the current map, so changing the positions
 * never undoes a drag except where a point disappears.
 */
export function resample(mesh: Mesh, xs: number[], ys: number[]): Mesh {
  const points: Pt[] = [];
  for (const y of ys) for (const x of xs) points.push(tableToScreen(mesh, { x, y }));
  return { width: mesh.width, height: mesh.height, xs: xs.slice(), ys: ys.slice(), points };
}

/** Points every `step` cm in both directions (see `stops`); a step of 0 or more than the table is the corners only. */
export function withSpacing(mesh: Mesh, step: number): Mesh {
  return resample(mesh, stops(mesh.width, step), stops(mesh.height, step));
}

/** The spacing the mesh was made with: its first cell, or null for corners only. */
export function spacing(mesh: Mesh): number | null {
  if (isCornersOnly(mesh)) return null;
  return Math.max(mesh.xs[1]! - mesh.xs[0]!, mesh.ys[1]! - mesh.ys[0]!);
}

/**
 * The mesh with one point moved. A corner moves the whole picture, because
 * the corners fix the homography: every other point keeps its nudge, not
 * its place on the screen, so a keystone adjustment after the inner points
 * have been set does not undo them.
 */
export function withPoint(mesh: Mesh, i: number, j: number, p: Pt): Mesh {
  const points = mesh.points.slice();
  points[pointIndex(mesh, i, j)] = { x: p.x, y: p.y };
  const c = cols(mesh);
  const r = rows(mesh);
  const corner = (i === 0 || i === c) && (j === 0 || j === r);
  if (!corner || isCornersOnly(mesh)) return { ...mesh, points };
  const old = solved(mesh);
  const next: Mesh = { ...mesh, points };
  const h = cornerHomography(next);
  if (!old.h || !h) return next;
  const n = mesh.xs.length;
  return {
    ...next,
    points: points.map((q, k) => {
      const ci = k % n;
      const cj = Math.floor(k / n);
      if ((ci === 0 || ci === c) && (cj === 0 || cj === r)) return q;
      const base = applyHomography(h, tablePointAt(mesh, ci, cj));
      const nudge = old.nudges[k]!;
      return { x: base.x + nudge.x, y: base.y + nudge.y };
    }),
  };
}

/** Back to the four corners: the inner points are forgotten. */
export function resetToCorners(mesh: Mesh): Mesh {
  return meshFromCorners(mesh.width, mesh.height, corners(mesh));
}

/**
 * A new table size keeping the same screen corners, so the picture does not
 * jump when the size box is edited, and the same spacing; inner points are
 * re-read from the corners' homography because their old table positions
 * no longer mean the same thing.
 */
export function withSize(mesh: Mesh, width: number, height: number): Mesh {
  const base = meshFromCorners(width, height, corners(mesh));
  const step = spacing(mesh);
  return step === null ? base : withSpacing(base, step);
}

/** Cells whose corners cross over (a point dragged past its neighbour): the picture would fold there. */
export function foldedCells(mesh: Mesh): Array<{ i: number; j: number }> {
  const out: Array<{ i: number; j: number }> = [];
  const cross = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let j = 0; j < rows(mesh); j++) {
    for (let i = 0; i < cols(mesh); i++) {
      const p00 = pointAt(mesh, i, j);
      const p10 = pointAt(mesh, i + 1, j);
      const p11 = pointAt(mesh, i + 1, j + 1);
      const p01 = pointAt(mesh, i, j + 1);
      const signs = [cross(p00, p10, p11), cross(p10, p11, p01), cross(p11, p01, p00), cross(p01, p00, p10)];
      const pos = signs.filter((s) => s > 0).length;
      if (pos !== 0 && pos !== 4) out.push({ i, j });
    }
  }
  return out;
}

/** Screen pixels per table centimetre, averaged over the mesh's edges. */
export function pixelsPerCm(mesh: Mesh): number {
  let total = 0;
  let n = 0;
  for (let j = 0; j <= rows(mesh); j++) {
    for (let i = 0; i < cols(mesh); i++) {
      const a = pointAt(mesh, i, j);
      const b = pointAt(mesh, i + 1, j);
      total += Math.hypot(b.x - a.x, b.y - a.y) / (mesh.xs[i + 1]! - mesh.xs[i]!);
      n++;
    }
  }
  for (let j = 0; j < rows(mesh); j++) {
    for (let i = 0; i <= cols(mesh); i++) {
      const a = pointAt(mesh, i, j);
      const b = pointAt(mesh, i, j + 1);
      total += Math.hypot(b.x - a.x, b.y - a.y) / (mesh.ys[j + 1]! - mesh.ys[j]!);
      n++;
    }
  }
  return n ? total / n : 0;
}

export interface Triangles {
  /** Screen x, y per vertex. */
  screen: Float32Array;
  /** Table x, y (cm) per vertex. */
  table: Float32Array;
  indices: Uint32Array;
}

/** The sample positions along one axis: `sub` steps across every cell. */
function subdivide(positions: number[], sub: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i]!;
    const b = positions[i + 1]!;
    for (let k = 0; k < sub; k++) out.push(a + ((b - a) * k) / sub);
  }
  out.push(positions[positions.length - 1]!);
  return out;
}

/**
 * The table cut into small triangles for drawing: `sub` × `sub` quads per
 * cell, each vertex carrying its screen position and the table point it
 * stands for. The renderer draws the pattern through this.
 */
export function triangulate(mesh: Mesh, sub = 8): Triangles {
  const xs = subdivide(mesh.xs, sub);
  const ys = subdivide(mesh.ys, sub);
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  const screen = new Float32Array(xs.length * ys.length * 2);
  const table = new Float32Array(xs.length * ys.length * 2);
  let k = 0;
  for (const y of ys) {
    for (const x of xs) {
      const s = tableToScreen(mesh, { x, y });
      screen[k] = s.x;
      table[k++] = x;
      screen[k] = s.y;
      table[k++] = y;
    }
  }
  const indices = new Uint32Array(nx * ny * 6);
  let n = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      indices[n++] = a;
      indices[n++] = b;
      indices[n++] = c;
      indices[n++] = b;
      indices[n++] = d;
      indices[n++] = c;
    }
  }
  return { screen, table, indices };
}

export interface GridLine {
  /** Table position of the line, cm. */
  at: number;
  vertical: boolean;
  /** Screen points along it, finely enough to bend with the mesh. */
  points: Pt[];
}

function lineAcross(mesh: Mesh, at: number, vertical: boolean, samples: number): GridLine {
  const points: Pt[] = [];
  const len = vertical ? mesh.height : mesh.width;
  for (let k = 0; k <= samples; k++) {
    const v = (len * k) / samples;
    points.push(tableToScreen(mesh, vertical ? { x: at, y: v } : { x: v, y: at }));
  }
  return { at, vertical, points };
}

/** Lines across the table every `step` cm in both directions, plus the far edges. */
export function gridLines(mesh: Mesh, step: number, samplesPerCell = 6): GridLine[] {
  const lines: GridLine[] = [];
  if (!(step > 0)) return lines;
  const nv = Math.max(2, rows(mesh) * samplesPerCell);
  const nh = Math.max(2, cols(mesh) * samplesPerCell);
  for (const x of stops(mesh.width, step).filter((v, i, a) => i === 0 || v - a[i - 1]! > 1e-9)) lines.push(lineAcross(mesh, x, true, nv));
  for (const y of stops(mesh.height, step).filter((v, i, a) => i === 0 || v - a[i - 1]! > 1e-9)) lines.push(lineAcross(mesh, y, false, nh));
  return lines;
}

/** The mesh's own column and row lines. */
export function cellLines(mesh: Mesh, samplesPerCell = 6): GridLine[] {
  const nv = Math.max(2, rows(mesh) * samplesPerCell);
  const nh = Math.max(2, cols(mesh) * samplesPerCell);
  return [...mesh.xs.map((x) => lineAcross(mesh, x, true, nv)), ...mesh.ys.map((y) => lineAcross(mesh, y, false, nh))];
}

/** Index of the mesh point within `radius` screen px of `p`, nearest first; null if none. */
export function nearestPoint(mesh: Mesh, p: Pt, radius: number): { i: number; j: number } | null {
  let best: { i: number; j: number; d: number } | null = null;
  for (let j = 0; j <= rows(mesh); j++) {
    for (let i = 0; i <= cols(mesh); i++) {
      const q = pointAt(mesh, i, j);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= radius && (!best || d < best.d)) best = { i, j, d };
    }
  }
  return best && { i: best.i, j: best.j };
}

function positions(raw: unknown, length: number): number[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const out: number[] = [];
  for (const v of raw as unknown[]) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    if (out.length && v <= out[out.length - 1]!) return null;
    out.push(v);
  }
  if (out[0] !== 0 || Math.abs(out[out.length - 1]! - length) > 1e-6) return null;
  return out;
}

/** A mesh read back from storage (an older one with a column and row count is accepted), or null if the shape is wrong. */
export function parseMesh(raw: unknown): Mesh | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<Mesh> & { cols?: number; rows?: number };
  if (typeof m.width !== 'number' || typeof m.height !== 'number' || !(m.width > 0 && m.height > 0)) return null;
  const even = (n: unknown, length: number) =>
    typeof n === 'number' && n >= 1 ? Array.from({ length: Math.round(n) + 1 }, (_, i) => (length * i) / Math.round(n)) : null;
  const xs = positions(m.xs, m.width) ?? even(m.cols, m.width);
  const ys = positions(m.ys, m.height) ?? even(m.rows, m.height);
  if (!xs || !ys || !Array.isArray(m.points) || m.points.length !== xs.length * ys.length) return null;
  const points: Pt[] = [];
  for (const p of m.points as unknown[]) {
    if (!p || typeof p !== 'object') return null;
    const { x, y } = p as Partial<Pt>;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push({ x, y });
  }
  return { width: m.width, height: m.height, xs, ys, points };
}
