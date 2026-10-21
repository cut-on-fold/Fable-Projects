import { describe, expect, it } from 'vitest';
import { applyHomography, homographyFromPoints, rectCorners } from '../src/calc/homography';
import { blankFrame, correction, darkenedCentroid, dotNear, localScale, luma, orangeScore, paintDisc, type Frame } from '../src/calc/vision';

/**
 * A white mat with faint pencil lines, a pink line, some blue lines and a red line that the camera shows
 * reddish-orange under the projector's light, as the camera sees it.
 */
function mat(): Frame {
  const f = blankFrame(200, 160);
  for (let x = 0; x < 200; x += 20) for (let y = 0; y < 160; y++) set(f, x, y, [120, 120, 125]); // pencil
  for (let y = 0; y < 160; y += 20) for (let x = 0; x < 200; x++) set(f, x, y, [90, 110, 200]); // blue
  for (let x = 0; x < 200; x++) set(f, x, 80, [225, 110, 150]); // pink
  for (let x = 0; x < 200; x++) set(f, x, 40, RED_LINE);
  for (let y = 0; y < 160; y++) set(f, 100, y, RED_LINE);
  return f;
}
function set(f: Frame, x: number, y: number, rgb: [number, number, number]): void {
  const i = (y * f.width + x) * 4;
  f.data[i] = rgb[0];
  f.data[i + 1] = rgb[1];
  f.data[i + 2] = rgb[2];
}
/**
 * Make a ring darker the way a projected black ring does: everything under it keeps its colour but dims.
 * With `clip`, only below and to the right of it, as the screen's edge cuts a ring off.
 */
function dim(f: Frame, cx: number, cy: number, radius: number, hole: number, factor: number, clip?: { x?: number; y?: number }): void {
  for (let y = 0; y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > radius || d < hole) continue;
      if (clip && (x + 0.5 < (clip.x ?? -Infinity) || y + 0.5 < (clip.y ?? -Infinity))) continue;
      const i = (y * f.width + x) * 4;
      for (let c = 0; c < 3; c++) f.data[i + c] = Math.round(f.data[i + c]! * factor);
    }
  }
}
const ORANGE: [number, number, number] = [232, 140, 58];
const RED_LINE: [number, number, number] = [235, 135, 115];

describe('luma', () => {
  it('is brightness', () => {
    expect(luma(255, 255, 255)).toBeCloseTo(255);
    expect(luma(0, 0, 0)).toBe(0);
  });
});

describe('darkenedCentroid', () => {
  it('finds the centre of a projected ring and ignores what was there already', () => {
    const lit = mat();
    const ringed = mat();
    dim(ringed, 101.3, 77.6, 14, 9, 0.2);
    const c = darkenedCentroid(lit, ringed)!;
    expect(c).not.toBeNull();
    expect(Math.abs(c.x - 101.3)).toBeLessThan(0.3);
    expect(Math.abs(c.y - 77.6)).toBeLessThan(0.3);
    expect(c.spread).toBeGreaterThan(9);
    expect(c.spread).toBeLessThan(14);
    expect(c.radius).toBeGreaterThan(10);
    expect(c.radius).toBeLessThan(13);
  });
  it('finds the centre of a ring cut off by the edge of the screen, from the half or the quarter that shows', () => {
    const lit = mat();
    const half = mat();
    dim(half, 101.3, 77.6, 14, 9, 0.5, { y: 77.6 }); // only the bottom half is projected
    const c = darkenedCentroid(lit, half, 30, 10, { x: 101, y: 84, r: 50 })!;
    expect(c).not.toBeNull();
    expect(c.radius).not.toBeNull();
    expect(Math.abs(c.x - 101.3)).toBeLessThan(0.5);
    expect(Math.abs(c.y - 77.6)).toBeLessThan(0.5);
    const quarter = mat();
    dim(quarter, 101.3, 77.6, 14, 9, 0.5, { x: 101.3, y: 77.6 });
    const q = darkenedCentroid(lit, quarter, 30, 10, { x: 108, y: 84, r: 50 })!;
    expect(q).not.toBeNull();
    expect(Math.abs(q.x - 101.3)).toBeLessThan(0.7);
    expect(Math.abs(q.y - 77.6)).toBeLessThan(0.7);
    expect(c.coverage).toBeLessThan(0.6);
    expect(q.coverage).toBeLessThan(0.35);
    expect(darkenedCentroid(lit, half, 30, 10)!.coverage).toBeLessThan(0.6);
  });
  it('holds the radius it is told for a short arc, which a projector blurs unevenly', () => {
    const lit = mat();
    const whole = mat();
    // darker towards the inside, as the projector's black is next to the bright hole: the free fit is pulled inwards
    for (let k = 0; k < 5; k++) dim(whole, 101.3, 77.6, 9.5 + k, 8.5 + k, 0.55 + k * 0.08);
    const full = darkenedCentroid(lit, whole, 30, 10, { x: 101, y: 84, r: 50 })!;
    expect(full.coverage).toBeGreaterThan(0.95);
    expect(Math.abs(full.x - 101.3)).toBeLessThan(0.3);
    const quarter = mat();
    for (let k = 0; k < 5; k++) dim(quarter, 101.3, 77.6, 9.5 + k, 8.5 + k, 0.55 + k * 0.08, { x: 101.3, y: 77.6 });
    const q = darkenedCentroid(lit, quarter, 30, 10, { x: 108, y: 84, r: 50 }, full.radius!)!;
    expect(q).not.toBeNull();
    expect(q.radius).toBeCloseTo(full.radius!, 5);
    expect(Math.abs(q.x - 101.3)).toBeLessThan(0.4);
    expect(Math.abs(q.y - 77.6)).toBeLessThan(0.4);
  });
  it('knows the camera scale at a point from the map', () => {
    const h = homographyFromPoints(rectCorners(1920, 1080), [{ x: 100, y: 100 }, { x: 1060, y: 100 }, { x: 1060, y: 640 }, { x: 100, y: 640 }])!;
    expect(localScale(h, { x: 500, y: 500 })).toBeCloseTo(0.5, 3);
  });
  it('sees a ring that is only a shade darker than the mat, as a projected black is in a lit room', () => {
    const lit = mat();
    const ringed = mat();
    dim(ringed, 60.4, 100.2, 14, 9, 0.92); // about 20 of 255 darker on white
    const c = darkenedCentroid(lit, ringed)!;
    expect(c).not.toBeNull();
    expect(c.n).toBeGreaterThan(200);
    expect(Math.abs(c.x - 60.4)).toBeLessThan(0.3);
    expect(Math.abs(c.y - 100.2)).toBeLessThan(0.3);
    expect(c.drop).toBeLessThan(20);
  });
  it('takes out a change of exposure between the two frames', () => {
    const lit = mat();
    const ringed = mat();
    dim(ringed, 0, 0, 1000, 0, 0.95); // the whole picture a touch darker
    expect(darkenedCentroid(lit, ringed)).toBeNull();
    dim(ringed, 60.4, 100.2, 14, 9, 0.9);
    const c = darkenedCentroid(lit, ringed)!;
    expect(c).not.toBeNull();
    expect(Math.abs(c.x - 60.4)).toBeLessThan(0.3);
    expect(Math.abs(c.y - 100.2)).toBeLessThan(0.3);
  });
  it('is null when nothing changed, or the frames differ in size', () => {
    expect(darkenedCentroid(mat(), mat())).toBeNull();
    expect(darkenedCentroid(mat(), blankFrame(10, 10))).toBeNull();
  });
  it('ignores flicker in the dark parts of the picture, and specks away from where the ring should be', () => {
    const lit = mat();
    // a laptop in the corner, dark grey; the floor off the edge, darker still
    for (let y = 0; y < 60; y++) for (let x = 0; x < 50; x++) set(lit, x, y, [70, 70, 75]);
    for (let y = 140; y < 160; y++) for (let x = 0; x < 200; x++) set(lit, x, y, [40, 40, 40]);
    const ringed = { ...lit, data: new Uint8ClampedArray(lit.data) };
    // the dark parts flicker between frames, by more than the faint ring darkens the mat
    for (let k = 0; k < 400; k++) {
      const x = (k * 37) % 50;
      const y = (k * 53) % 60;
      set(ringed, x, y, [40, 40, 45]);
      set(ringed, (k * 41) % 200, 140 + ((k * 7) % 20), [10, 10, 10]);
    }
    // and a speck of change on the mat, well away from the ring
    for (let y = 100; y < 110; y++) for (let x = 170; x < 180; x++) set(ringed, x, y, [200, 200, 200]);
    dim(ringed, 101.3, 77.6, 14, 9, 0.9);
    const loose = darkenedCentroid(lit, ringed)!;
    expect(loose.spread).toBeGreaterThan(30); // the speck and the flicker count without a reach
    const c = darkenedCentroid(lit, ringed, 30, 10, { x: 110, y: 70, r: 50 })!;
    expect(c).not.toBeNull();
    expect(Math.abs(c.x - 101.3)).toBeLessThan(0.3);
    expect(Math.abs(c.y - 77.6)).toBeLessThan(0.3);
    expect(c.spread).toBeLessThan(14);
    // the search walks to the ring from a start a little off, as the corners' guess is
    const far = darkenedCentroid(lit, ringed, 30, 10, { x: 125, y: 60, r: 50 })!;
    expect(Math.abs(far.x - 101.3)).toBeLessThan(0.3);
    expect(Math.abs(far.y - 77.6)).toBeLessThan(0.3);
  });
  it('reports a wide spread for darkening scattered about, so the caller can refuse it', () => {
    const lit = mat();
    const ringed = mat();
    for (let k = 0; k < 60; k++) set(ringed, (k * 37) % 200, (k * 53) % 160, [200, 200, 200]);
    const c = darkenedCentroid(lit, ringed, 30, 10)!;
    expect(c).not.toBeNull();
    expect(c.spread).toBeGreaterThan(40);
  });
});

describe('orangeScore and dotNear', () => {
  it('ignores a single speck', () => {
    const f = mat();
    set(f, 10, 10, ORANGE);
    expect(dotNear(f, { x: 10, y: 10 }, 20)).toBeNull();
    expect(dotNear(f, { x: 10, y: 10 }, 20, 40, 1)).not.toBeNull();
  });
  it('scores paint, not the mat', () => {
    expect(orangeScore(...ORANGE)).toBeGreaterThan(100);
    expect(orangeScore(255, 215, 170)).toBeGreaterThan(40); // a blurred, pale edge of a dot
    expect(orangeScore(255, 255, 255)).toBe(0);
    expect(orangeScore(225, 110, 150)).toBe(0); // pink line
    expect(orangeScore(90, 110, 200)).toBe(0); // blue line
    expect(orangeScore(120, 120, 125)).toBe(0); // pencil
    expect(orangeScore(230, 120, 110)).toBe(0); // a red mat line: red over blue, but green no higher than blue
    expect(orangeScore(...RED_LINE)).toBeLessThan(orangeScore(...ORANGE) / 2); // a reddish-orange line scores, but well under the paint
    expect(orangeScore(250, 115, 70)).toBeGreaterThan(100); // a red-orange dot
    expect(orangeScore(239, 98, 45)).toBeGreaterThan(100); // orange vinyl
    expect(orangeScore(230, 169, 20)).toBe(0); // a golden yellow
    expect(orangeScore(235, 225, 60)).toBe(0); // a yellow ruler
    expect(orangeScore(120, 80, 40)).toBe(0); // the brown edge of a wooden table
    expect(orangeScore(60, 30, 10)).toBe(0); // orange in shadow: too dark to trust
  });
  it('finds the dot on a crossing of red lines, not the lines', () => {
    const f = mat();
    paintDisc(f, 100.5, 40.5, 1.6, ORANGE); // on the crossing of the two red lines
    const d = dotNear(f, { x: 92, y: 46 }, 20)!;
    expect(d).not.toBeNull();
    expect(Math.abs(d.x - 100.5)).toBeLessThan(0.3);
    expect(Math.abs(d.y - 40.5)).toBeLessThan(0.3);
    expect(d.spread).toBeLessThan(2);
  });
  it('reports a line as a wide spread, so the caller does not walk along it', () => {
    const d = dotNear(mat(), { x: 100, y: 120 }, 20)!; // on the vertical red line, no dot
    expect(d).not.toBeNull();
    expect(d.spread).toBeGreaterThan(8);
  });
  it('finds a tiny blurred dot', () => {
    const f = mat();
    // a two-pixel dot with pale edges, as the wide lens sees a 4 mm dot
    set(f, 100, 60, [240, 160, 90]);
    set(f, 101, 60, [240, 160, 90]);
    set(f, 99, 60, [255, 225, 190]);
    set(f, 102, 60, [255, 225, 190]);
    set(f, 100, 59, [255, 228, 195]);
    set(f, 101, 61, [255, 228, 195]);
    const d = dotNear(f, { x: 96, y: 56 }, 20)!;
    expect(d).not.toBeNull();
    expect(Math.abs(d.x - 101)).toBeLessThan(0.6);
    expect(Math.abs(d.y - 60.5)).toBeLessThan(0.6);
    expect(d.peak).toBeGreaterThan(100);
  });
  it('is null with nothing orange within reach', () => {
    const f = mat();
    paintDisc(f, 150, 100, 2, ORANGE);
    expect(dotNear(f, { x: 60, y: 120 }, 20)).toBeNull();
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
