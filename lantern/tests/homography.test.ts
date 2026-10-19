import { describe, expect, it } from 'vitest';
import { applyAffine, applyHomography, homographyFromPoints, invert, multiply, rectCorners, rotation, scaling, solve, translation, type Pt } from '../src/calc/homography';

const close = (a: Pt, b: Pt, eps = 1e-6) => {
  expect(a.x).toBeCloseTo(b.x, Math.round(-Math.log10(eps)));
  expect(a.y).toBeCloseTo(b.y, Math.round(-Math.log10(eps)));
};

describe('solve', () => {
  it('solves a small system', () => {
    expect(solve([[2, 1], [1, 3]], [5, 10])).toEqual([1, 3]);
  });
  it('returns null when singular', () => {
    expect(solve([[1, 2], [2, 4]], [1, 2])).toBeNull();
  });
});

describe('homographyFromPoints', () => {
  const src = rectCorners(90, 60);
  it('maps the four points exactly', () => {
    const dst: Pt[] = [{ x: 100, y: 80 }, { x: 1800, y: 120 }, { x: 1750, y: 1000 }, { x: 140, y: 960 }];
    const h = homographyFromPoints(src, dst)!;
    expect(h).not.toBeNull();
    for (let i = 0; i < 4; i++) close(applyHomography(h, src[i]!), dst[i]!);
  });
  it('is a plain scale and shift when the corners are a rectangle', () => {
    const dst = rectCorners(900, 600).map((p) => ({ x: p.x + 50, y: p.y + 20 }));
    const h = homographyFromPoints(src, dst)!;
    close(applyHomography(h, { x: 45, y: 30 }), { x: 500, y: 320 });
    expect(h[6]).toBeCloseTo(0);
    expect(h[7]).toBeCloseTo(0);
  });
  it('keeps straight lines straight under keystone', () => {
    const dst: Pt[] = [{ x: 200, y: 0 }, { x: 1700, y: 0 }, { x: 1900, y: 1000 }, { x: 0, y: 1000 }];
    const h = homographyFromPoints(src, dst)!;
    const a = applyHomography(h, { x: 10, y: 10 });
    const b = applyHomography(h, { x: 50, y: 30 });
    const c = applyHomography(h, { x: 90, y: 50 });
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
    // the far (narrow) end is foreshortened: equal table steps are smaller on the screen there
    const top = applyHomography(h, { x: 45, y: 10 }).x - applyHomography(h, { x: 35, y: 10 }).x;
    const bottom = applyHomography(h, { x: 45, y: 50 }).x - applyHomography(h, { x: 35, y: 50 }).x;
    expect(top).toBeLessThan(bottom);
  });
  it('refuses a degenerate quadrilateral', () => {
    expect(homographyFromPoints(src, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])).toBeNull();
    expect(homographyFromPoints(src.slice(0, 3), rectCorners(1, 1))).toBeNull();
  });
  it('inverts back', () => {
    const dst: Pt[] = [{ x: 100, y: 80 }, { x: 1800, y: 120 }, { x: 1750, y: 1000 }, { x: 140, y: 960 }];
    const h = homographyFromPoints(src, dst)!;
    const inv = invert(h)!;
    close(applyHomography(inv, applyHomography(h, { x: 12.5, y: 41 })), { x: 12.5, y: 41 });
    expect(invert([1, 2, 3, 2, 4, 6, 0, 0, 1])).toBeNull();
  });
});

describe('affine helpers', () => {
  it('rotation is clockwise on a y-down screen', () => {
    close(applyAffine(rotation(90), { x: 1, y: 0 }), { x: 0, y: 1 });
  });
  it('composes right to left', () => {
    const m = multiply(translation(10, 0), scaling(2));
    close(applyAffine(m, { x: 1, y: 1 }), { x: 12, y: 2 });
  });
});
