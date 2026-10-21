import { describe, expect, it } from 'vitest';
import { applyHomography, homographyFromPoints, rectCorners, type Mat3, type Pt } from '../src/calc/homography';
import { blankFrame, paintDisc, type Frame } from '../src/calc/vision';
import { autoCalibrate, autoPoint, summarise, type AutoHost, type AutoOutcome } from '../src/autocal';

// A pretend table seen by a pretend camera: a white mat with reddish lines through every dot, orange dots,
// and a projector that dims a ring where it is told to. The camera's map of the screen is a little wrong,
// as four clicked corners always are, so the loop has to take more than one go.

const W = 1920;
const H = 1080;
const PIC = { w: 640, h: 480 };
const ORANGE: [number, number, number] = [232, 140, 58];
const RED_LINE: [number, number, number] = [230, 150, 110];

/** What the corners say: screen → picture. */
const clicked = homographyFromPoints(rectCorners(W, H), [{ x: 80, y: 60 }, { x: 560, y: 70 }, { x: 550, y: 420 }, { x: 90, y: 410 }])!;
/** Where the projector's light really lands in the picture: a few pixels off the clicked map. */
const real = homographyFromPoints(rectCorners(W, H), [{ x: 84, y: 57 }, { x: 556, y: 73 }, { x: 553, y: 416 }, { x: 87, y: 413 }])!;

interface Table {
  /** Dots on the mat, in picture pixels, by point. */
  dots: Map<string, Pt>;
  /** Lines through these picture x and y positions. */
  lines: { xs: number[]; ys: number[] };
  /** How much darker a projected black is than the mat, 1 being not at all. */
  black: number;
  /** Dark things in the picture (a laptop, the floor past the mat's edge), which flicker from frame to frame. */
  dark?: Array<{ x: number; y: number; w: number; h: number }>;
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
  for (const d of table.dots.values()) paintDisc(f, d.x, d.y, 1.6, ORANGE);
  if (ring) {
    const c = applyHomography(real, ring);
    const scale = 0.25; // picture px per screen px, near enough
    const outer = 34 * scale;
    const inner = 22 * scale;
    for (let y = Math.floor(c.y - outer); y <= Math.ceil(c.y + outer); y++) {
      for (let x = Math.floor(c.x - outer); x <= Math.ceil(c.x + outer); x++) {
        if (x < 0 || y < 0 || x >= PIC.w || y >= PIC.h) continue;
        const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
        if (d > outer || d < inner) continue;
        const i = (y * PIC.w + x) * 4;
        for (let k = 0; k < 3; k++) f.data[i + k] = Math.round(f.data[i + k]! * table.black);
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

function fake(table: Table, points: Map<string, Pt>, map: Mat3 = clicked): Fake {
  let ring: Pt | null = null;
  let seed = 1;
  let stopped = false;
  const progress: string[] = [];
  const host: AutoHost = {
    homography: () => map,
    pictureSize: () => PIC,
    grab: async (roi) => crop(picture(table, ring, seed++), roi),
    showRing: async (p) => {
      ring = p;
    },
    getPoint: (i, j) => points.get(key(i, j))!,
    setPoint: (i, j, p) => {
      points.set(key(i, j), p);
    },
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
    const backwards = homographyFromPoints(rectCorners(W, H), [{ x: 560, y: 420 }, { x: 80, y: 410 }, { x: 90, y: 60 }, { x: 550, y: 70 }])!;
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
