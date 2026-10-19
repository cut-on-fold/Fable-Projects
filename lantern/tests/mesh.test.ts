import { describe, expect, it } from 'vitest';
import { applyHomography, rectCorners, type Pt } from '../src/calc/homography';
import {
  cornerHomography, foldedCells, gridLines, meshFromCorners, nearestPoint, parseMesh, pixelsPerCm, pointAt, resample, resetToCorners,
  screenToTable, tablePointAt, tableToScreen, triangulate, withPoint, withSize, type Mesh,
} from '../src/calc/mesh';

const close = (a: Pt, b: Pt, digits = 5) => {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
};

/** A 90 × 60 cm table drawn 10 px per cm from (100, 50): flat and square. */
const flat = () => meshFromCorners(90, 60, rectCorners(900, 600).map((p) => ({ x: p.x + 100, y: p.y + 50 })));
/** The same table with keystone: the top edge narrower than the bottom. */
const keystone = () => meshFromCorners(90, 60, [{ x: 200, y: 0 }, { x: 1700, y: 0 }, { x: 1900, y: 1000 }, { x: 0, y: 1000 }]);

describe('a one-cell mesh is a homography', () => {
  it('maps table to screen and back', () => {
    const m = flat();
    close(tableToScreen(m, { x: 45, y: 30 }), { x: 550, y: 350 });
    close(screenToTable(m, { x: 550, y: 350 }), { x: 45, y: 30 });
    const k = keystone();
    for (const p of [{ x: 0, y: 0 }, { x: 90, y: 60 }, { x: 12, y: 50 }, { x: 70, y: 5 }]) close(screenToTable(k, tableToScreen(k, p)), p);
  });
  it('labels each crossing with its table position', () => {
    const m = resample(flat(), 3, 2);
    expect(tablePointAt(m, 1, 1)).toEqual({ x: 30, y: 30 });
    expect(tablePointAt(m, 3, 2)).toEqual({ x: 90, y: 60 });
  });
  it('points are stored top-left, top-right, bottom-left, bottom-right', () => {
    const m = flat();
    expect(pointAt(m, 0, 0)).toEqual({ x: 100, y: 50 });
    expect(pointAt(m, 1, 0)).toEqual({ x: 1000, y: 50 });
    expect(pointAt(m, 0, 1)).toEqual({ x: 100, y: 650 });
    expect(pointAt(m, 1, 1)).toEqual({ x: 1000, y: 650 });
    expect(cornerHomography(m)).not.toBeNull();
  });
});

describe('resample', () => {
  it('adds points along the corners homography, so nothing moves', () => {
    const k = keystone();
    const m = resample(k, 6, 4);
    expect(m.points).toHaveLength(7 * 5);
    for (let j = 0; j <= 4; j++) for (let i = 0; i <= 6; i++) close(pointAt(m, i, j), tableToScreen(k, tablePointAt(m, i, j)));
    // and between the points it is still the homography, not a straight blend of the points
    for (const p of [{ x: 7, y: 7 }, { x: 44, y: 31 }, { x: 83, y: 58 }]) close(tableToScreen(m, p), tableToScreen(k, p));
    close(screenToTable(m, { x: 900, y: 400 }), screenToTable(k, { x: 900, y: 400 }));
  });
  it('keeps a dragged point when the new grid lands on it', () => {
    let m = resample(flat(), 2, 2);
    m = withPoint(m, 1, 1, { x: 560, y: 372 });
    const finer = resample(m, 4, 4);
    close(pointAt(finer, 2, 2), { x: 560, y: 372 });
    // and reads the bent map for the new points in between
    close(pointAt(finer, 1, 1), tableToScreen(m, { x: 22.5, y: 15 }));
  });
  it('a coarser grid reads the bent map too', () => {
    let m = resample(flat(), 4, 4);
    m = withPoint(m, 2, 2, { x: 560, y: 372 });
    const coarser = resample(m, 2, 2);
    close(pointAt(coarser, 1, 1), { x: 560, y: 372 });
  });
  it('moving a corner carries the inner points with the homography but keeps their nudges', () => {
    let m = resample(flat(), 2, 2);
    m = withPoint(m, 1, 1, { x: 560, y: 372 }); // the centre nudged by (10, 22)
    m = withPoint(m, 2, 0, { x: 1000, y: 90 }); // the top-right corner pulled down 40 px
    close(pointAt(m, 2, 0), { x: 1000, y: 90 });
    const h = cornerHomography(m)!;
    // the top-edge midpoint follows the new homography exactly
    close(pointAt(m, 1, 0), applyHomography(h, { x: 45, y: 0 }));
    // the centre is the homography plus its old nudge
    const centre = applyHomography(h, { x: 45, y: 30 });
    close(pointAt(m, 1, 1), { x: centre.x + 10, y: centre.y + 22 });
    // an inner point moves alone
    const alone = withPoint(m, 1, 2, { x: 500, y: 700 });
    expect(alone.points.filter((p, k) => p !== m.points[k])).toHaveLength(1);
  });
  it('a one-cell resample is just the corners', () => {
    const m = withPoint(resample(flat(), 2, 2), 1, 1, { x: 500, y: 300 });
    const one = resample(m, 1, 1);
    expect(one.points).toEqual(flat().points);
    expect(resetToCorners(m)).toEqual(flat());
  });
});

describe('a bent mesh', () => {
  /** The right-hand third of the desk dips: its crossings sit lower and further right than a flat desk would put them. */
  const dipped = (): Mesh => {
    let m = resample(flat(), 3, 2);
    m = withPoint(m, 3, 1, { x: 1012, y: 358 });
    m = withPoint(m, 2, 1, { x: 706, y: 354 });
    return m;
  };
  it('bends the map only near the moved points', () => {
    const m = dipped();
    close(tableToScreen(m, { x: 15, y: 15 }), { x: 250, y: 200 });
    close(tableToScreen(m, { x: 30, y: 30 }), { x: 400, y: 350 });
    close(tableToScreen(m, { x: 60, y: 30 }), { x: 706, y: 354 });
    // halfway between a moved point and a still one, half the nudge
    close(tableToScreen(m, { x: 45, y: 30 }), { x: 553, y: 352 });
    const p = tableToScreen(m, { x: 75, y: 30 });
    expect(p.x).toBeGreaterThan(850);
    expect(p.y).toBeGreaterThan(350);
  });
  it('screenToTable inverts tableToScreen everywhere, including the bent cells', () => {
    const m = dipped();
    for (const t of [{ x: 5, y: 5 }, { x: 75, y: 30 }, { x: 89, y: 59 }, { x: 60, y: 29.9 }, { x: 60.1, y: 30.1 }]) close(screenToTable(m, tableToScreen(m, t)), t, 4);
  });
  it('carries on past the table edge', () => {
    const m = dipped();
    const outside = screenToTable(m, { x: 50, y: 20 });
    expect(outside.x).toBeLessThan(0);
    expect(outside.y).toBeLessThan(0);
    close(tableToScreen(m, outside), { x: 50, y: 20 }, 4);
  });
  it('spots a fold when a point is dragged past its neighbour', () => {
    const m = dipped();
    expect(foldedCells(m)).toEqual([]);
    const folded = withPoint(m, 1, 1, { x: 750, y: 350 });
    expect(foldedCells(folded).length).toBeGreaterThan(0);
  });
  it('averages the pixels per centimetre', () => {
    expect(pixelsPerCm(flat())).toBeCloseTo(10);
    expect(pixelsPerCm(resample(flat(), 3, 3))).toBeCloseTo(10);
  });
});

describe('withSize', () => {
  it('keeps the screen corners and re-reads the inner points', () => {
    const m = withPoint(resample(flat(), 2, 2), 1, 1, { x: 560, y: 372 });
    const bigger = withSize(m, 100, 60);
    expect(bigger.width).toBe(100);
    expect(pointAt(bigger, 0, 0)).toEqual({ x: 100, y: 50 });
    expect(pointAt(bigger, 2, 2)).toEqual({ x: 1000, y: 650 });
    close(pointAt(bigger, 1, 1), { x: 550, y: 350 });
  });
});

describe('triangulate and gridLines', () => {
  it('cuts each cell into sub × sub quads with the table position on every vertex', () => {
    const m = resample(flat(), 3, 2);
    const t = triangulate(m, 4);
    expect(t.indices.length).toBe(12 * 8 * 6);
    expect(t.screen.length).toBe(13 * 9 * 2);
    // the last vertex is the bottom-right corner
    expect(t.table[t.table.length - 2]).toBeCloseTo(90);
    expect(t.table[t.table.length - 1]).toBeCloseTo(60);
    expect(t.screen[t.screen.length - 2]).toBeCloseTo(1000);
    expect(t.screen[t.screen.length - 1]).toBeCloseTo(650);
    for (const ix of t.indices) expect(ix).toBeLessThan(13 * 9);
  });
  it('draws a line every step with the far edges included', () => {
    const lines = gridLines(flat(), 10);
    const vertical = lines.filter((l) => l.vertical).map((l) => l.at);
    const horizontal = lines.filter((l) => !l.vertical).map((l) => l.at);
    expect(vertical).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(horizontal).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(lines[0]!.points[0]).toEqual({ x: 100, y: 50 });
    expect(gridLines(flat(), 0)).toEqual([]);
  });
});

describe('nearestPoint and parseMesh', () => {
  it('picks the nearest crossing within reach', () => {
    const m = resample(flat(), 3, 2);
    expect(nearestPoint(m, { x: 405, y: 348 }, 20)).toEqual({ i: 1, j: 1 });
    expect(nearestPoint(m, { x: 500, y: 500 }, 20)).toBeNull();
  });
  it('round-trips through JSON and rejects the wrong shape', () => {
    const m = withPoint(resample(flat(), 2, 2), 1, 1, { x: 560, y: 372 });
    expect(parseMesh(JSON.parse(JSON.stringify(m)))).toEqual(m);
    expect(parseMesh(null)).toBeNull();
    expect(parseMesh({ ...m, points: m.points.slice(1) })).toBeNull();
    expect(parseMesh({ ...m, width: 0 })).toBeNull();
    expect(parseMesh({ ...m, points: [...m.points.slice(0, 8), { x: 'a', y: 1 }] })).toBeNull();
  });
});
