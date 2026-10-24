import { describe, expect, it } from 'vitest';
import { applyHomography, homographyFromPoints, invert, rectCorners, type Mat3, type Pt } from '../src/calc/homography';
import { blankFrame, darkenedCentroid, localScale, luma, paintDisc, type Frame } from '../src/calc/vision';
import { autoCalibrate, autoPoint, inwardStep, RING_INNER, RING_OUTER, summarise, type AutoHost, type AutoOutcome } from '../src/autocal';

// A pretend table seen by a pretend camera: a white mat with reddish lines through every dot, orange dots,
// and a projector that dims a ring where it is told to. The camera's map of the screen is a little wrong,
// as four clicked corners always are, so the loop has to take more than one go.

const W = 1920;
const H = 1080;
const PIC = { w: 960, h: 720 }; // about 0.375 picture px per screen px
const ORANGE: [number, number, number] = [232, 140, 58];
const RED_LINE: [number, number, number] = [235, 135, 115];

/** What the corners say: screen → picture. */
const clicked = homographyFromPoints(rectCorners(W, H), [{ x: 120, y: 90 }, { x: 840, y: 105 }, { x: 825, y: 630 }, { x: 135, y: 615 }])!;
/** Where the projector's light really lands in the picture: a few pixels off the clicked map. */
const real = homographyFromPoints(rectCorners(W, H), [{ x: 126, y: 86 }, { x: 834, y: 110 }, { x: 830, y: 624 }, { x: 130, y: 620 }])!;

interface Table {
  /** Dots on the mat, in picture pixels, by point. */
  dots: Map<string, Pt>;
  /** Lines through these picture x and y positions. */
  lines: { xs: number[]; ys: number[] };
  /** How much darker a projected black is than the mat, 1 being not at all. */
  black: number;
  /** Dark things in the picture (a laptop, the floor past the mat's edge), which flicker from frame to frame. */
  dark?: Array<{ x: number; y: number; w: number; h: number }>;
  /** Which picture pixels the projector lights (inside the screen), worked out once. */
  screen?: Uint8Array;
  /**
   * The mat glows: light travels this many picture pixels through it in direction (dx, dy), away from the
   * projector, before coming back out, carrying `share` of the brightness with it. So a dark ring is filled in
   * on the side facing the projector and trails a shadow on the other.
   */
  glow?: { dx: number; dy: number; length: number; share: number };
}

/** Whether each picture pixel is inside the projected screen; beyond it the mat is only in room light and no ring shows. */
function litByProjector(table: Table): Uint8Array {
  if (table.screen) return table.screen;
  const inv = invert(real)!;
  const mask = new Uint8Array(PIC.w * PIC.h);
  for (let y = 0; y < PIC.h; y++) {
    for (let x = 0; x < PIC.w; x++) {
      const s = applyHomography(inv, { x: x + 0.5, y: y + 0.5 });
      mask[y * PIC.w + x] = s.x >= 0 && s.x <= W && s.y >= 0 && s.y <= H ? 1 : 0;
    }
  }
  table.screen = mask;
  return mask;
}

function key(i: number, j: number): string {
  return `${i},${j}`;
}

/** A frame of the table, with the ring projected at screen point `ring` if given. */
function picture(table: Table, ring: Pt | null, seed: number): Frame {
  const f = blankFrame(PIC.w, PIC.h);
  const paint = (x: number, y: number, rgb: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= PIC.w || y >= PIC.h) return;
    const i = (y * PIC.w + x) * 4;
    f.data[i] = rgb[0];
    f.data[i + 1] = rgb[1];
    f.data[i + 2] = rgb[2];
  };
  for (const x of table.lines.xs) for (let y = 0; y < PIC.h; y++) paint(Math.round(x), y, RED_LINE);
  for (const y of table.lines.ys) for (let x = 0; x < PIC.w; x++) paint(x, Math.round(y), RED_LINE);
  for (const d of table.dots.values()) paintDisc(f, d.x, d.y, 2.4, ORANGE);
  const lit = litByProjector(table);
  for (let k = 0; k < PIC.w * PIC.h; k++) {
    if (lit[k]) continue;
    for (let c = 0; c < 3; c++) f.data[k * 4 + c] = Math.round(f.data[k * 4 + c]! * 0.45);
  }
  if (ring) {
    const c = applyHomography(real, ring);
    // the ring is as big in the picture as the camera's scale makes it where it lands, as a projected one is
    const scale = localScale(real, ring);
    const outer = RING_OUTER * scale;
    const inner = RING_INNER * scale;
    // how dark the projector makes each pixel, 0 to 1, before the mat's glow spreads it
    const x0 = Math.max(0, Math.floor(c.x - outer) - 20);
    const y0 = Math.max(0, Math.floor(c.y - outer) - 20);
    const x1 = Math.min(PIC.w - 1, Math.ceil(c.x + outer) + 20);
    const y1 = Math.min(PIC.h - 1, Math.ceil(c.y + outer) + 20);
    const cols = x1 - x0 + 1;
    const dark = new Float32Array(cols * (y1 - y0 + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!lit[y * PIC.w + x]) continue; // the screen ends here
        const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
        if (d > outer || d < inner) continue;
        dark[(y - y0) * cols + (x - x0)] = 1;
      }
    }
    const g = table.glow;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!lit[y * PIC.w + x]) continue;
        let v = dark[(y - y0) * cols + (x - x0)]!;
        if (g) {
          // what this pixel shows is partly what the light brought from upstream, towards the projector
          let up = 0;
          for (let s = 1; s <= g.length; s++) {
            const ux = Math.round(x - g.dx * s) - x0;
            const uy = Math.round(y - g.dy * s) - y0;
            if (ux >= 0 && uy >= 0 && ux < cols && uy <= y1 - y0) up += dark[uy * cols + ux]!;
          }
          v = (1 - g.share) * v + (g.share * up) / g.length;
        }
        if (v <= 0) continue;
        const i = (y * PIC.w + x) * 4;
        const factor = 1 - v * (1 - table.black);
        for (let k = 0; k < 3; k++) f.data[i + k] = Math.round(f.data[i + k]! * factor);
      }
    }
  }
  // a little sensor noise, the same for the same seed
  let s = seed;
  for (let i = 0; i < f.data.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const n = (s % 5) - 2;
    for (let k = 0; k < 3; k++) f.data[i + k] = Math.max(0, Math.min(255, f.data[i + k]! + n));
  }
  // dark things flicker far more than the mat does
  for (const d of table.dark ?? []) {
    for (let y = d.y; y < d.y + d.h; y++) {
      for (let x = d.x; x < d.x + d.w; x++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        paint(x, y, [60 + (s % 40), 60 + (s % 40), 65 + (s % 40)]);
      }
    }
  }
  return f;
}

function crop(f: Frame, roi: { x: number; y: number; w: number; h: number }): Frame {
  const out = blankFrame(roi.w, roi.h);
  for (let y = 0; y < roi.h; y++) {
    out.data.set(f.data.subarray(((roi.y + y) * f.width + roi.x) * 4, ((roi.y + y) * f.width + roi.x + roi.w) * 4), y * roi.w * 4);
  }
  return out;
}

interface Fake {
  host: AutoHost;
  points: Map<string, Pt>;
  stop: () => void;
  progress: string[];
}

function fake(table: Table, points: Map<string, Pt>, map: Mat3 = clicked, lag = false): Fake {
  let ring: Pt | null = null;
  let caughtUp: Pt | null = null; // what the camera's picture shows: one grab behind the screen when it lags
  let seed = 1;
  let stopped = false;
  const progress: string[] = [];
  const host: AutoHost = {
    homography: () => map,
    pictureSize: () => PIC,
    screenSize: () => ({ w: W, h: H }),
    grab: async (roi) => {
      const frame = crop(picture(table, lag ? caughtUp : ring, seed++), roi);
      caughtUp = ring;
      return frame;
    },
    showRing: async (p) => {
      ring = p;
    },
    getPoint: (i, j) => points.get(key(i, j))!,
    setPoint: (i, j, p) => {
      points.set(key(i, j), p);
    },
    neighbours: (i, j) => [key(i - 1, j), key(i + 1, j), key(i, j - 1), key(i, j + 1)].map((k) => points.get(k)).filter((p): p is Pt => !!p),
    settleMs: 0,
    progress: (t) => {
      progress.push(t);
    },
    stopped: () => stopped,
  };
  return { host, points, stop: () => (stopped = true), progress };
}

/** A 3 × 3 grid of points whose dots are where the real map puts `truth`, starting `off` screen pixels away. */
function grid(off: Pt): { table: Table; points: Map<string, Pt>; truth: Map<string, Pt> } {
  const dots = new Map<string, Pt>();
  const points = new Map<string, Pt>();
  const truth = new Map<string, Pt>();
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      const t = { x: 300 + i * 600, y: 200 + j * 300 };
      const d = applyHomography(real, t);
      truth.set(key(i, j), t);
      dots.set(key(i, j), d);
      points.set(key(i, j), { x: t.x + off.x, y: t.y + off.y });
      xs.add(d.x);
      ys.add(d.y);
    }
  }
  return { table: { dots, lines: { xs: [...xs], ys: [...ys] }, black: 0.9 }, points, truth };
}

const label = (i: number, j: number) => `${i}×${j}`;

describe('autoPoint', () => {
  it('moves a point until the projected ring sits on the dot, in a few goes, with the map a little wrong', async () => {
    const { table, points } = grid({ x: 30, y: -24 });
    const f = fake(table, points);
    const out = await autoPoint(f.host, 1, 1);
    expect(out.ok).toBe(true);
    expect(out.gap).toBeLessThanOrEqual(1.5);
    const landed = applyHomography(real, points.get(key(1, 1))!);
    const dot = table.dots.get(key(1, 1))!;
    expect(Math.hypot(landed.x - dot.x, landed.y - dot.y)).toBeLessThan(1);
    expect(f.progress.length).toBeLessThanOrEqual(4);
  });
  it('takes the dot nearest the ring, not a neighbour, when the corners put the ring most of a cell out', async () => {
    // dots every 150 screen px (about 56 picture px, as 15 cm on a big mat seen by a wide lens), and a map that
    // is out by two thirds of that: corners clicked a little off, or a lens that bends the picture
    const dots = new Map<string, Pt>();
    const points = new Map<string, Pt>();
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3; i++) {
        const t = { x: 600 + i * 150, y: 300 + j * 150 };
        const d = applyHomography(real, t);
        dots.set(key(i, j), d);
        points.set(key(i, j), { x: t.x + 6, y: t.y - 4 });
        xs.add(d.x);
        ys.add(d.y);
      }
    }
    const table: Table = { dots, lines: { xs: [...xs], ys: [...ys] }, black: 0.9 };
    const rough = homographyFromPoints(rectCorners(W, H), [{ x: 158, y: 90 }, { x: 878, y: 105 }, { x: 863, y: 630 }, { x: 173, y: 615 }])!; // the clicked map, 38 px to the right
    const f = fake(table, points, rough);
    let reach = Infinity;
    f.host.record = (d) => {
      reach = d.reach;
    };
    const out = await autoPoint(f.host, 1, 1);
    expect(out.ok, out.reason).toBe(true);
    const landed = applyHomography(real, points.get(key(1, 1))!);
    const own = dots.get(key(1, 1))!;
    expect(Math.hypot(landed.x - own.x, landed.y - own.y)).toBeLessThan(1);
    expect(reach).toBeLessThan(30); // under half the 56 px between dots, so the neighbour at 56 px was never in reach
    expect(out.mapOff).toBeGreaterThan(30);
    expect(out.mapOff).toBeLessThan(50);
    expect(summarise([out], label)).toMatch(/rough/);
    expect(summarise([{ ...out, mapOff: 4 }], label)).not.toMatch(/rough/);
  });
  it('finds the ring where it is when the mat glows one way, where every darkened pixel would lean', () => {
    // the projector is beyond the top of the table: its light travels down the picture through the mat
    const { table, truth } = grid({ x: 0, y: 0 });
    table.glow = { dx: 0, dy: 1, length: 6, share: 0.5 };
    const at = truth.get(key(1, 1))!;
    const centre = applyHomography(real, at);
    const lit = picture(table, null, 1);
    const ringed = picture(table, at, 2);
    const found = darkenedCentroid(lit, ringed, 30, 10, { x: centre.x + 3, y: centre.y - 2, r: 60 })!;
    expect(found).not.toBeNull();
    // every darkened pixel weighted by how dark, the old way, leans down the picture, away from the projector
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let y = 0; y < PIC.h; y++) {
      for (let x = 0; x < PIC.w; x++) {
        if (Math.hypot(x + 0.5 - centre.x, y + 0.5 - centre.y) > 40) continue;
        const i = (y * PIC.w + x) * 4;
        const d = luma(lit.data[i]!, lit.data[i + 1]!, lit.data[i + 2]!) - luma(ringed.data[i]!, ringed.data[i + 1]!, ringed.data[i + 2]!);
        if (d <= found.drop) continue;
        sx += (x + 0.5) * d;
        sy += (y + 0.5) * d;
        sw += d;
      }
    }
    const lean = { x: sx / sw - centre.x, y: sy / sw - centre.y };
    expect(lean.y).toBeGreaterThan(0.7);
    expect(Math.abs(lean.x)).toBeLessThan(0.3);
    // the darkest line of the ring stays put
    expect(Math.abs(found.x - centre.x)).toBeLessThan(0.25);
    expect(Math.abs(found.y - centre.y)).toBeLessThan(0.25);
    expect(found.coverage).toBeGreaterThan(0.9);
  });
  it('lands on the dot, not a glow-width short of it, when the mat glows', async () => {
    const { table, points } = grid({ x: 30, y: -24 });
    table.glow = { dx: 0, dy: 1, length: 6, share: 0.5 };
    const f = fake(table, points);
    for (const [i, j] of [[1, 1], [0, 1]] as const) {
      const out = await autoPoint(f.host, i, j);
      expect(out.ok, out.reason).toBe(true);
      const landed = applyHomography(real, points.get(key(i, j))!);
      const dot = table.dots.get(key(i, j))!;
      expect(Math.hypot(landed.x - dot.x, landed.y - dot.y), `${i}×${j}`).toBeLessThan(0.5);
    }
  });
  it('waits for a camera picture that lags the screen, instead of correcting twice and overshooting', async () => {
    const { table, points } = grid({ x: 36, y: -28 });
    const f = fake(table, points, clicked, true);
    let retakes = 0;
    f.host.record = (d) => {
      retakes += d.retakes;
    };
    const out = await autoPoint(f.host, 1, 1);
    expect(out.ok, out.reason).toBe(true);
    const landed = applyHomography(real, points.get(key(1, 1))!);
    const dot = table.dots.get(key(1, 1))!;
    expect(Math.hypot(landed.x - dot.x, landed.y - dot.y)).toBeLessThan(1);
    expect(retakes).toBeGreaterThan(0);
    // the same lag at a corner, where two stepped-in rings are shown each go
    const corner = { x: 0, y: 0 };
    table.dots.set(key(0, 0), applyHomography(real, corner));
    points.set(key(0, 0), { x: 24, y: 18 });
    const c = await autoPoint(f.host, 0, 0);
    expect(c.ok, c.reason).toBe(true);
    const landedC = applyHomography(real, points.get(key(0, 0))!);
    const dotC = applyHomography(real, corner);
    expect(Math.hypot(landedC.x - dotC.x, landedC.y - dotC.y)).toBeLessThan(1.5);
  });
  it('is not put off by a laptop or the floor flickering in the picture', async () => {
    const { table, points } = grid({ x: 24, y: -18 });
    const corner = table.dots.get(key(0, 0))!;
    const edge = table.dots.get(key(1, 2))!;
    table.dark = [
      { x: 0, y: 0, w: Math.round(corner.x) - 30, h: Math.round(corner.y) + 40 }, // a laptop by the corner
      { x: 0, y: Math.round(edge.y) + 45, w: PIC.w, h: 100 }, // the floor past the mat's edge
    ];
    const f = fake(table, points);
    expect((await autoPoint(f.host, 0, 0)).ok).toBe(true);
    expect((await autoPoint(f.host, 1, 2)).ok).toBe(true);
  });
  it('sets a point on the edge of the screen and one in its corner, where the ring is cut off', async () => {
    const { table, points } = grid({ x: 30, y: -10 });
    const edge = { x: 900, y: 0 };
    const corner = { x: 0, y: 0 };
    table.dots.set(key(1, 0), applyHomography(real, edge));
    table.dots.set(key(0, 0), applyHomography(real, corner));
    points.set(key(1, 0), { x: 930, y: 0 });
    points.set(key(0, 0), { x: 24, y: 18 });
    const f = fake(table, points);
    const checks: Array<{ coverage: number; delta: number; used: boolean }> = [];
    f.host.record = (d) => {
      if (d.check) checks.push(d.check);
    };
    for (const [i, j, truth] of [[1, 0, edge], [0, 0, corner]] as const) {
      const out = await autoPoint(f.host, i, j);
      expect(out.ok, `${i}×${j}: ${out.reason}`).toBe(true);
      const landed = applyHomography(real, points.get(key(i, j))!);
      const dot = applyHomography(real, truth);
      // what the loop accepts; the corner dot sits half in the unlit picture here, which shifts its measured centre
      expect(Math.hypot(landed.x - dot.x, landed.y - dot.y), `${i}×${j}`).toBeLessThan(1.5);
    }
    // the ring at the point itself was looked at too, and on this flat table agrees with the straight-line guess
    expect(checks.length).toBeGreaterThan(0);
    const edgeCheck = checks[0]!;
    expect(edgeCheck.coverage).toBeGreaterThan(0.4);
    expect(edgeCheck.delta).toBeLessThan(1.5);
    expect(edgeCheck.used).toBe(true);
  });
  it('refuses a corner when something on the mat covers part of a stepped-in ring, and puts the point back', async () => {
    const { table, points } = grid({ x: 30, y: -10 });
    const corner = { x: 0, y: 0 };
    table.dots.set(key(0, 0), applyHomography(real, corner));
    points.set(key(0, 0), { x: 24, y: 18 });
    // a tool lying over where the first stepped-in ring falls
    const where = applyHomography(real, { x: 24 + 50, y: 18 + 50 });
    table.dark = [{ x: Math.round(where.x) - 40, y: Math.round(where.y) - 6, w: 80, h: 30 }];
    const start = { ...points.get(key(0, 0))! };
    const out = await autoPoint(fake(table, points).host, 0, 0);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not whole|relative to each other|not seen/);
    expect(points.get(key(0, 0))).toEqual(start);
  });
  it('steps the rings in from the screen edge only for a point whose ring would be cut off', () => {
    const screen = { w: W, h: H };
    expect(inwardStep({ x: 900, y: 500 }, screen)).toBeNull();
    expect(inwardStep({ x: 900, y: 0 }, screen)).toEqual({ x: 0, y: 50 });
    expect(inwardStep({ x: 0, y: 0 }, screen)).toEqual({ x: 50, y: 50 });
    expect(inwardStep({ x: W, y: H }, screen)).toEqual({ x: -50, y: -50 });
    expect(inwardStep({ x: 20, y: H - 10 }, screen)).toEqual({ x: 50, y: -50 });
    expect(inwardStep({ x: 40, y: 500 }, screen)).toBeNull(); // the whole ring just fits
  });
  it('sees a ring that is only a shade darker than the mat', async () => {
    const { table, points } = grid({ x: -20, y: 16 });
    table.black = 0.93;
    const out = await autoPoint(fake(table, points).host, 0, 2);
    expect(out.ok).toBe(true);
  });
  it('puts a point back where it was when there is no dot, only the mat lines', async () => {
    const { table, points } = grid({ x: 20, y: 20 });
    table.dots.delete(key(2, 0));
    const start = { ...points.get(key(2, 0))! };
    const out = await autoPoint(fake(table, points).host, 2, 0);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/line|no dot/);
    expect(points.get(key(2, 0))).toEqual(start);
  });
  it('puts a point back when the ring cannot be seen', async () => {
    const { table, points } = grid({ x: 20, y: 20 });
    table.black = 1; // the projector is off
    const start = { ...points.get(key(0, 0))! };
    const out = await autoPoint(fake(table, points).host, 0, 0);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/ring was not seen/);
    expect(points.get(key(0, 0))).toEqual(start);
  });
  it('gives up, and puts the point back, when the ring and the dot do not close in', async () => {
    const { table, points } = grid({ x: 20, y: 20 });
    // a map that sends every step the wrong way
    const backwards = homographyFromPoints(rectCorners(W, H), [{ x: 840, y: 630 }, { x: 120, y: 615 }, { x: 135, y: 90 }, { x: 825, y: 105 }])!;
    const start = { ...points.get(key(1, 1))! };
    const out = await autoPoint(fake(table, points, backwards).host, 1, 1);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not closing in|moved/);
    expect(points.get(key(1, 1))).toEqual(start);
  });
});

describe('autoCalibrate and summarise', () => {
  it('sets every point it can and says which it could not, and why', async () => {
    const { table, points } = grid({ x: -16, y: 12 });
    table.dots.delete(key(0, 1));
    const f = fake(table, points);
    const all: Array<{ i: number; j: number }> = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) all.push({ i, j });
    const outcomes = await autoCalibrate(f.host, all, label);
    expect(outcomes).toHaveLength(9);
    expect(outcomes.filter((o) => o.ok)).toHaveLength(8);
    const text = summarise(outcomes, label);
    expect(text).toMatch(/^8 of 9 points set from the camera\. Left as they were: 0×1 \(/);
  });
  it('stops when told to', async () => {
    const { table, points } = grid({ x: 10, y: 10 });
    const f = fake(table, points);
    let n = 0;
    f.host.progress = () => {
      if (++n === 3) f.stop();
    };
    const outcomes = await autoCalibrate(f.host, [{ i: 0, j: 0 }, { i: 1, j: 0 }, { i: 2, j: 0 }], label);
    expect(outcomes.length).toBeLessThan(3);
    expect(summarise([], label)).toBe('Nothing was set.');
    const stopped: AutoOutcome = { i: 0, j: 0, ok: false, gap: NaN, reason: 'stopped' };
    expect(summarise([stopped], label)).toContain('0×0 (stopped)');
  });
});
