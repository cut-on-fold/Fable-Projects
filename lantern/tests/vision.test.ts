import { describe, expect, it } from 'vitest';
import { applyHomography, homographyFromPoints, rectCorners } from '../src/calc/homography';
import { blankFrame, correction, darkenedCentroid, dotNear, isOrange, luma, nearestBlob, orangeBlobs, orangeScore, paintDisc, type Frame } from '../src/calc/vision';

/** A white mat with faint pencil lines, a pink line and some blue lines, as the camera sees it. */
function mat(): Frame {
  const f = blankFrame(200, 160);
  for (let x = 0; x < 200; x += 20) for (let y = 0; y < 160; y++) set(f, x, y, [120, 120, 125]); // pencil
  for (let y = 0; y < 160; y += 20) for (let x = 0; x < 200; x++) set(f, x, y, [90, 110, 200]); // blue
  for (let x = 0; x < 200; x++) set(f, x, 80, [225, 110, 150]); // pink
  return f;
}
function set(f: Frame, x: number, y: number, rgb: [number, number, number]): void {
  const i = (y * f.width + x) * 4;
  f.data[i] = rgb[0];
  f.data[i + 1] = rgb[1];
  f.data[i + 2] = rgb[2];
}
const ORANGE: [number, number, number] = [232, 140, 58];

describe('isOrange', () => {
  it('takes orange paint and nothing else on the mat', () => {
    expect(isOrange(...ORANGE)).toBe(true);
    expect(isOrange(255, 255, 255)).toBe(false); // white mat
    expect(isOrange(225, 110, 150)).toBe(false); // pink line
    expect(isOrange(90, 110, 200)).toBe(false); // blue line
    expect(isOrange(120, 120, 125)).toBe(false); // pencil
    expect(isOrange(235, 225, 60)).toBe(false); // a yellow ruler
    expect(isOrange(60, 30, 10)).toBe(false); // orange in shadow: too dark to trust
  });
  it('luma is brightness', () => {
    expect(luma(255, 255, 255)).toBeCloseTo(255);
    expect(luma(0, 0, 0)).toBe(0);
  });
});

describe('darkenedCentroid', () => {
  it('finds the centre of a projected ring and ignores what was there already', () => {
    const lit = mat();
    const ringed = mat();
    paintDisc(ringed, 101.3, 77.6, 14, [40, 40, 40], 9);
    const c = darkenedCentroid(lit, ringed)!;
    expect(c).not.toBeNull();
    expect(c.x).toBeCloseTo(101.3, 0);
    expect(c.y).toBeCloseTo(77.6, 0);
    expect(Math.abs(c.x - 101.3)).toBeLessThan(0.3);
    expect(Math.abs(c.y - 77.6)).toBeLessThan(0.3);
  });
  it('is null when nothing changed, or the frames differ in size', () => {
    expect(darkenedCentroid(mat(), mat())).toBeNull();
    expect(darkenedCentroid(mat(), blankFrame(10, 10))).toBeNull();
  });
});

describe('orangeBlobs and nearestBlob', () => {
  it('finds dots on the mat, largest first, with their centres', () => {
    const f = mat();
    paintDisc(f, 60.5, 40.5, 2, ORANGE);
    paintDisc(f, 140.2, 100.7, 2.6, ORANGE);
    const blobs = orangeBlobs(f);
    expect(blobs).toHaveLength(2);
    expect(blobs[0]!.n).toBeGreaterThan(blobs[1]!.n);
    expect(Math.abs(blobs[0]!.x - 140.2)).toBeLessThan(0.4);
    expect(Math.abs(blobs[0]!.y - 100.7)).toBeLessThan(0.4);
    const near = nearestBlob(blobs, { x: 64, y: 44 }, 20)!;
    expect(Math.abs(near.x - 60.5)).toBeLessThan(0.4);
    expect(nearestBlob(blobs, { x: 100, y: 10 }, 20)).toBeNull();
  });
  it('ignores specks smaller than the minimum', () => {
    const f = mat();
    set(f, 10, 10, ORANGE);
    expect(orangeBlobs(f)).toHaveLength(0);
    expect(orangeBlobs(f, 1)).toHaveLength(1);
  });
  it('does not join blobs across the picture edge', () => {
    const f = blankFrame(10, 4);
    set(f, 9, 0, ORANGE);
    set(f, 0, 1, ORANGE);
    expect(orangeBlobs(f, 1)).toHaveLength(2);
  });
});

describe('orangeScore and dotNear', () => {
  it('scores paint, not the mat', () => {
    expect(orangeScore(...ORANGE)).toBeGreaterThan(100);
    expect(orangeScore(255, 215, 170)).toBeGreaterThan(40); // a blurred, pale edge of a dot
    expect(orangeScore(255, 255, 255)).toBe(0);
    expect(orangeScore(225, 110, 150)).toBe(0); // pink line
    expect(orangeScore(90, 110, 200)).toBe(0); // blue line
    expect(orangeScore(120, 120, 125)).toBe(0); // pencil
  });
  it('finds a tiny blurred dot the hard test misses', () => {
    const f = mat();
    // a two-pixel dot with pale edges, as the wide lens sees a 4 mm dot: the edges fail the hard test,
    // so it sees a two-pixel speck and throws it away
    set(f, 100, 60, [240, 160, 90]);
    set(f, 101, 60, [240, 160, 90]);
    set(f, 99, 60, [255, 225, 190]);
    set(f, 102, 60, [255, 225, 190]);
    set(f, 100, 59, [255, 228, 195]);
    set(f, 101, 61, [255, 228, 195]);
    expect(orangeBlobs(f)).toHaveLength(0);
    const d = dotNear(f, { x: 96, y: 56 }, 20)!;
    expect(d).not.toBeNull();
    expect(Math.abs(d.x - 101)).toBeLessThan(0.6);
    expect(Math.abs(d.y - 60.5)).toBeLessThan(0.6);
    expect(d.peak).toBeGreaterThan(100);
  });
  it('is null with nothing orange within reach, and reports the best it saw', () => {
    const f = mat();
    paintDisc(f, 150, 100, 2, ORANGE);
    expect(dotNear(f, { x: 40, y: 40 }, 20)).toBeNull();
    expect(dotNear(f, { x: 140, y: 95 }, 20)).not.toBeNull();
  });
});

describe('correction', () => {
  // screen 1920 × 1080 seen by a camera at 0.6 px per screen px, shifted and slightly keystoned
  const h = homographyFromPoints(rectCorners(1920, 1080), [{ x: 300, y: 200 }, { x: 1450, y: 210 }, { x: 1470, y: 870 }, { x: 280, y: 860 }])!;
  it('moves the screen point so the ring lands on the dot', () => {
    const screen = { x: 700, y: 500 };
    const ring = applyHomography(h, screen);
    const dot = { x: ring.x + 6, y: ring.y - 4 };
    const step = correction(h, screen, ring, dot);
    const landed = applyHomography(h, { x: screen.x + step.x, y: screen.y + step.y });
    expect(Math.abs(landed.x - dot.x)).toBeLessThan(0.05);
    expect(Math.abs(landed.y - dot.y)).toBeLessThan(0.05);
    // the camera sees the screen smaller, so screen steps are bigger than camera gaps
    expect(Math.hypot(step.x, step.y)).toBeGreaterThan(Math.hypot(6, 4));
  });
  it('is zero when the ring is on the dot, and safe on a broken map', () => {
    const ring = applyHomography(h, { x: 100, y: 100 });
    expect(correction(h, { x: 100, y: 100 }, ring, ring)).toEqual({ x: 0, y: 0 });
    expect(correction([0, 0, 0, 0, 0, 0, 0, 0, 1], { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
  });
});
