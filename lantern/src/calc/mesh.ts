// The calibration mesh: where each point of the table lands on the screen.
//
// The table is a rectangle of `width` × `height` cm with its origin at the
// top-left corner. The mesh divides it into `cols` × `rows` cells and keeps
// one screen point per grid crossing: where that spot on the table has to
// be drawn so that the projector puts it in the right place.
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
  cols: number;
  rows: number;
  /** (cols + 1) × (rows + 1) screen points, row by row from the top-left. */
  points: Pt[];
}

export function pointIndex(mesh: Pick<Mesh, 'cols'>, i: number, j: number): number {
  return j * (mesh.cols + 1) + i;
}

export function pointAt(mesh: Mesh, i: number, j: number): Pt {
  return mesh.points[pointIndex(mesh, i, j)]!;
}

/** The table position (cm) that grid crossing (i, j) stands for. */
export function tablePointAt(mesh: Mesh, i: number, j: number): Pt {
  return { x: (mesh.width * i) / mesh.cols, y: (mesh.height * j) / mesh.rows };
}

export function corners(mesh: Mesh): [Pt, Pt, Pt, Pt] {
  return [pointAt(mesh, 0, 0), pointAt(mesh, mesh.cols, 0), pointAt(mesh, mesh.cols, mesh.rows), pointAt(mesh, 0, mesh.rows)];
}

/** A one-cell mesh from the four corners: top-left, top-right, bottom-right, bottom-left. */
export function meshFromCorners(width: number, height: number, c: readonly Pt[]): Mesh {
  if (c.length !== 4) throw new Error('four corners');
  return { width, height, cols: 1, rows: 1, points: [c[0]!, c[1]!, c[3]!, c[2]!] };
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
  const nudges = mesh.points.map((p, k) => {
    if (!h) return { x: 0, y: 0 };
    const i = k % (mesh.cols + 1);
    const j = Math.floor(k / (mesh.cols + 1));
    const base = applyHomography(h, tablePointAt(mesh, i, j));
    return { x: p.x - base.x, y: p.y - base.y };
  });
  s = { h, inv, nudges };
  solvedCache.set(mesh, s);
  return s;
}

function cellOf(mesh: Mesh, p: Pt): { i: number; j: number; u: number; v: number } {
  const fx = (p.x / mesh.width) * mesh.cols;
  const fy = (p.y / mesh.height) * mesh.rows;
  const i = Math.min(mesh.cols - 1, Math.max(0, Math.floor(fx)));
  const j = Math.min(mesh.rows - 1, Math.max(0, Math.floor(fy)));
  return { i, j, u: fx - i, v: fy - j };
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
  if (mesh.cols === 1 && mesh.rows === 1) return base;
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
  if (mesh.cols === 1 && mesh.rows === 1) return t;
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
 * The same map sampled on a new grid of cells. Points that already exist stay
 * where they are when the new grid lands on them; everything else is read
 * off the current map, so changing the count never undoes a drag except
 * where a point disappears.
 */
export function resample(mesh: Mesh, cols: number, rows: number): Mesh {
  cols = Math.max(1, Math.round(cols));
  rows = Math.max(1, Math.round(rows));
  const points: Pt[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const t = { x: (mesh.width * i) / cols, y: (mesh.height * j) / rows };
      points.push(tableToScreen(mesh, t));
    }
  }
  return { width: mesh.width, height: mesh.height, cols, rows, points };
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
  const corner = (i === 0 || i === mesh.cols) && (j === 0 || j === mesh.rows);
  if (!corner || (mesh.cols === 1 && mesh.rows === 1)) return { ...mesh, points };
  const old = solved(mesh);
  const next: Mesh = { ...mesh, points };
  const h = cornerHomography(next);
  if (!old.h || !h) return next;
  return {
    ...next,
    points: points.map((q, k) => {
      const ci = k % (mesh.cols + 1);
      const cj = Math.floor(k / (mesh.cols + 1));
      if ((ci === 0 || ci === mesh.cols) && (cj === 0 || cj === mesh.rows)) return q;
      const base = applyHomography(h, tablePointAt(mesh, ci, cj));
      const n = old.nudges[k]!;
      return { x: base.x + n.x, y: base.y + n.y };
    }),
  };
}

/** Back to the four corners: the inner points are forgotten. */
export function resetToCorners(mesh: Mesh): Mesh {
  return meshFromCorners(mesh.width, mesh.height, corners(mesh));
}

/**
 * A new table size keeping the same screen corners, so the picture does not
 * jump when the size box is edited; inner points are re-read from the
 * corners' homography because their old table positions no longer exist.
 */
export function withSize(mesh: Mesh, width: number, height: number): Mesh {
  const base = meshFromCorners(width, height, corners(mesh));
  return mesh.cols === 1 && mesh.rows === 1 ? base : resample(base, mesh.cols, mesh.rows);
}

/** Cells whose corners cross over (a point dragged past its neighbour): the picture would fold there. */
export function foldedCells(mesh: Mesh): Array<{ i: number; j: number }> {
  const out: Array<{ i: number; j: number }> = [];
  const cross = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let j = 0; j < mesh.rows; j++) {
    for (let i = 0; i < mesh.cols; i++) {
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

/** Screen pixels per table centimetre, averaged over the mesh. */
export function pixelsPerCm(mesh: Mesh): number {
  let total = 0;
  let n = 0;
  for (let j = 0; j <= mesh.rows; j++) {
    for (let i = 0; i < mesh.cols; i++) {
      const a = pointAt(mesh, i, j);
      const b = pointAt(mesh, i + 1, j);
      total += Math.hypot(b.x - a.x, b.y - a.y) / (mesh.width / mesh.cols);
      n++;
    }
  }
  for (let j = 0; j < mesh.rows; j++) {
    for (let i = 0; i <= mesh.cols; i++) {
      const a = pointAt(mesh, i, j);
      const b = pointAt(mesh, i, j + 1);
      total += Math.hypot(b.x - a.x, b.y - a.y) / (mesh.height / mesh.rows);
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

/**
 * The table cut into small triangles for drawing: `sub` × `sub` quads per
 * cell, each vertex carrying its screen position and the table point it
 * stands for. The renderer draws the pattern through this.
 */
export function triangulate(mesh: Mesh, sub = 8): Triangles {
  const nx = mesh.cols * sub;
  const ny = mesh.rows * sub;
  const screen = new Float32Array((nx + 1) * (ny + 1) * 2);
  const table = new Float32Array((nx + 1) * (ny + 1) * 2);
  let k = 0;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const t = { x: (mesh.width * i) / nx, y: (mesh.height * j) / ny };
      const s = tableToScreen(mesh, t);
      screen[k] = s.x;
      table[k++] = t.x;
      screen[k] = s.y;
      table[k++] = t.y;
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

/**
 * Lines across the table every `step` cm in both directions (plus the far
 * edges), each as screen points sampled finely enough to bend with the mesh.
 */
export function gridLines(mesh: Mesh, step: number, samplesPerCell = 6): Array<{ at: number; vertical: boolean; points: Pt[] }> {
  const lines: Array<{ at: number; vertical: boolean; points: Pt[] }> = [];
  if (!(step > 0)) return lines;
  const stops = (len: number) => {
    const s: number[] = [];
    for (let v = 0; v < len - 1e-9; v += step) s.push(v);
    s.push(len);
    return s;
  };
  const nv = Math.max(2, Math.ceil(mesh.rows * samplesPerCell));
  for (const x of stops(mesh.width)) {
    const points: Pt[] = [];
    for (let k = 0; k <= nv; k++) points.push(tableToScreen(mesh, { x, y: (mesh.height * k) / nv }));
    lines.push({ at: x, vertical: true, points });
  }
  const nh = Math.max(2, Math.ceil(mesh.cols * samplesPerCell));
  for (const y of stops(mesh.height)) {
    const points: Pt[] = [];
    for (let k = 0; k <= nh; k++) points.push(tableToScreen(mesh, { x: (mesh.width * k) / nh, y }));
    lines.push({ at: y, vertical: false, points });
  }
  return lines;
}

/** Index of the mesh point within `radius` screen px of `p`, nearest first; null if none. */
export function nearestPoint(mesh: Mesh, p: Pt, radius: number): { i: number; j: number } | null {
  let best: { i: number; j: number; d: number } | null = null;
  for (let j = 0; j <= mesh.rows; j++) {
    for (let i = 0; i <= mesh.cols; i++) {
      const q = pointAt(mesh, i, j);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= radius && (!best || d < best.d)) best = { i, j, d };
    }
  }
  return best && { i: best.i, j: best.j };
}

/** A mesh read back from storage, or null if the shape is wrong. */
export function parseMesh(raw: unknown): Mesh | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Partial<Mesh>;
  if (typeof m.width !== 'number' || typeof m.height !== 'number' || typeof m.cols !== 'number' || typeof m.rows !== 'number') return null;
  if (!(m.width > 0 && m.height > 0) || m.cols < 1 || m.rows < 1 || !Array.isArray(m.points)) return null;
  if (m.points.length !== (m.cols + 1) * (m.rows + 1)) return null;
  const points: Pt[] = [];
  for (const p of m.points as unknown[]) {
    if (!p || typeof p !== 'object') return null;
    const { x, y } = p as Partial<Pt>;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push({ x, y });
  }
  return { width: m.width, height: m.height, cols: Math.round(m.cols), rows: Math.round(m.rows), points };
}
