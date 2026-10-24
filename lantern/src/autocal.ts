// Automatic calibration: for each point, project a small black ring on a
// white screen, find it and the painted dot in the camera picture, and move
// the point until the ring is centred on the dot. The seeing is in
// calc/vision.ts; this is the loop around it, with the waiting for the
// projector and the camera to catch up.

import type { Mat3, Pt } from './calc/homography';
import { applyHomography } from './calc/homography';
import { correction, darkenedCentroid, dotNear, localScale, type Frame, type RingFound } from './calc/vision';

/** The ring as drawn on the white screen: a black annulus between these radii, in screen pixels. */
export const RING_INNER = 22;
export const RING_OUTER = 34;
/** Where the darkening of the ring sits on average: the area-weighted mean radius of the annulus. */
export const RING_MEAN = ((2 / 3) * (RING_OUTER ** 3 - RING_INNER ** 3)) / (RING_OUTER ** 2 - RING_INNER ** 2);

/** What one run learns as it goes: the ring's apparent radius per unit of camera scale, from rings seen whole. */
export interface AutoMemory {
  ringScales: number[];
}

export interface AutoHost {
  /** Screen → camera picture, from the clicked corners. */
  homography(): Mat3 | null;
  /** The camera picture's size, in its own pixels. */
  pictureSize(): { w: number; h: number } | null;
  /** The screen's size, in screen pixels: where the projected picture ends. */
  screenSize(): { w: number; h: number };
  /** A piece of the current camera picture, after waiting for a fresh frame. */
  grab(roi: { x: number; y: number; w: number; h: number }): Promise<Frame | null>;
  /** Draw the ring at a screen point, or nothing; resolves once it is on screen. */
  showRing(p: Pt | null): Promise<void>;
  getPoint(i: number, j: number): Pt;
  setPoint(i: number, j: number, p: Pt): void;
  /** The screen points next to this one along its row and column (up to four), so the dots' spacing is known. */
  neighbours(i: number, j: number): Pt[];
  /** How long the camera takes to show a change, in ms. */
  settleMs: number;
  progress(text: string): void;
  stopped(): boolean;
  /** What the camera saw at a point, kept for the diagnostics picture. */
  record?(d: Diagnostic): void;
}

export interface Diagnostic {
  i: number;
  j: number;
  roi: { x: number; y: number; w: number; h: number };
  lit: Frame;
  ringed: Frame | null;
  ring: { x: number; y: number; n: number; drop: number; peak: number; spread: number; radius: number | null; coverage: number } | null;
  dot: { x: number; y: number; n: number; peak: number; spread: number } | null;
  /** The ring's expected place in the picture from the corners, within the roi. */
  guess: Pt;
  /**
   * For a point at the screen's edge, where its ring would be cut off: the rings were shown this far in from
   * it (screen px), twice, and `ring` is where the ring at the point itself would be, worked out from the two.
   */
  inward: Pt | null;
  /** Frames taken again because the picture still showed the ring where it was before the point moved. */
  retakes: number;
  /**
   * For a corner or edge point: the ring at the point itself, as much of it as the screen shows, fitted with the
   * size the stepped-in rings gave; `delta` is how far it sat from the straight-line guess, and `used` whether it
   * was taken over the guess.
   */
  check?: { x: number; y: number; coverage: number; delta: number; used: boolean };
  /** How far the first ring appeared from where the corners said it would, in camera px: how good the map is. */
  mapOff?: number;
  /** How far from the ring the dot was looked for, in camera px. */
  reach: number;
  outcome: AutoOutcome;
}

export interface AutoOutcome {
  i: number;
  j: number;
  ok: boolean;
  /** Camera pixels left between ring and dot at the end. */
  gap: number;
  reason?: string;
  /** How far the first ring appeared from where the corners said it would, in camera px. */
  mapOff?: number;
}

const ROI = 240; // camera px, square, around where the point is expected
const DOT_REACH = 60; // camera px: how far from the ring to look for the dot, at most
const DOT_SHARE = 0.4; // of the spacing between neighbouring dots in the picture: never look further than this for the dot, so a neighbour's dot is never taken for the point's own
const MAP_ROUGH = 15; // camera px: rings appearing further than this from where the corners say is a map worth mentioning
const RING_PIXELS = 30; // darkened pixels that count as seeing the ring
const RING_REACH = 90; // camera px: how far from where the ring should be to look for it
const RING_SPREAD = 60; // camera px: darkening further out than this on average is not a ring
const DOT_SPREAD = 8; // camera px: orange further out than this on average is a line or a smear, not a dot
const DOT_SCORE = 25; // the least orange score a pixel needs to be part of the dot (a small dot at the picture's edge is pale)
const DONE_GAP = 0.4; // camera px: close enough to stop
const ACCEPT_GAP = 1; // camera px: the most a point is kept at when the goes run out (about 1.3 mm on a 135 cm table)
const MAX_STEP = 60; // screen px per go, as a safety stop
const MAX_TRAVEL = 120; // screen px from where the point started, in all
const MAX_ROUNDS = 8; // measurements; the last one is never followed by an unmeasured move
const STEP_IN = RING_OUTER + 16; // screen px: how far in from the screen's edge the rings are shown for an edge point
const STALE_MOVE = 2.5; // camera px: a ring expected to move at least this far should not be found where it was
const STALE_STILL = 1; // camera px: found this close to where it was last time counts as not having moved
const MAX_RETAKES = 3; // frames to take again, waiting a settle each time, for a picture that lags the screen
const DIRECT_COVERAGE = 0.4; // how much of the ring at an edge point must show for its own fit to be used
const DIRECT_AGREE = 12; // camera px: further than this from the straight-line guess is something else, not the ring

/**
 * For a point whose ring would be cut off by the screen's edge (a corner or
 * edge point), the step inward, each way it is cut, that puts a whole ring
 * on the lit mat; null for a point whose ring shows whole where it is.
 */
export function inwardStep(p: Pt, screen: { w: number; h: number }): Pt | null {
  const edge = RING_OUTER + 2;
  const dx = p.x < edge ? 1 : p.x > screen.w - edge ? -1 : 0;
  const dy = p.y < edge ? 1 : p.y > screen.h - edge ? -1 : 0;
  return dx || dy ? { x: dx * STEP_IN, y: dy * STEP_IN } : null;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Set one point. Whatever goes wrong part way (the ring lost, the dot
 * lost, the gap not closing, the point wandering), the point goes back to
 * where it started, so a failed try never leaves the calibration worse.
 */
export async function autoPoint(host: AutoHost, i: number, j: number, memory: AutoMemory = { ringScales: [] }): Promise<AutoOutcome> {
  const h = host.homography();
  const size = host.pictureSize();
  if (!h || !size) return { i, j, ok: false, gap: NaN, reason: 'the corners have not been found in the picture' };
  const start = host.getPoint(i, j);
  const guess = applyHomography(h, start);
  if (!Number.isFinite(guess.x) || !Number.isFinite(guess.y)) return { i, j, ok: false, gap: NaN, reason: 'the corners give no sensible map' };
  // A corner or edge point has its ring cut off by the screen's edge, and a quarter of a ring in the dimmest part
  // of the picture is too little to measure from. So the rings are shown a step in from such a point, and two
  // steps in, both whole, and where the ring at the point itself would be follows from the two: as far again
  // beyond the first as the first is from the second.
  const inward = inwardStep(start, host.screenSize());
  const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
  // the piece of the picture to watch: around the point, or around the first stepped-in ring, with the second
  // ring and the dot either side of it
  const centre = inward ? applyHomography(h, add(start, inward)) : guess;
  const roi = {
    x: Math.round(Math.max(0, Math.min(size.w - ROI, centre.x - ROI / 2))),
    y: Math.round(Math.max(0, Math.min(size.h - ROI, centre.y - ROI / 2))),
    w: Math.min(ROI, size.w),
    h: Math.min(ROI, size.h),
  };
  if (guess.x < -ROI / 4 || guess.y < -ROI / 4 || guess.x > size.w + ROI / 4 || guess.y > size.h + ROI / 4) {
    return { i, j, ok: false, gap: NaN, reason: 'outside the camera picture' };
  }

  // the plain white table, once per point
  await host.showRing(null);
  await wait(host.settleMs);
  const lit = await host.grab(roi);
  if (!lit) return { i, j, ok: false, gap: NaN, reason: 'no camera picture' };
  const guessInRoi = { x: guess.x - roi.x, y: guess.y - roi.y };
  // How far to look from the ring for the dot: well under the spacing of the dots in the picture, so that with
  // the map out by most of a cell (corners clicked a crossing out, a lens that bends the picture) the dot taken
  // is still the one nearest the ring and never a neighbour's.
  const spacing = Math.min(
    Infinity,
    ...host.neighbours(i, j).map((n) => {
      const c = applyHomography(h, n);
      return Math.hypot(c.x - guess.x, c.y - guess.y);
    }),
  );
  const reach = Number.isFinite(spacing) && spacing > 0 ? Math.min(DOT_REACH, DOT_SHARE * spacing) : DOT_REACH;
  const diag: Diagnostic = { i, j, roi, lit, ringed: null, ring: null, dot: null, guess: guessInRoi, inward, retakes: 0, reach, outcome: { i, j, ok: false, gap: NaN } };
  let p = { ...start };
  const finish = (outcome: AutoOutcome): AutoOutcome => {
    if (!outcome.ok && (p.x !== start.x || p.y !== start.y)) host.setPoint(i, j, start);
    if (diag.mapOff !== undefined) outcome.mapOff = diag.mapOff;
    diag.outcome = outcome;
    host.record?.(diag);
    return outcome;
  };
  /** The first ring seen says how good the corners' map is: how far it appeared from where the map put it. */
  const noteMap = (ring: Pt, expected: Pt) => {
    if (diag.mapOff === undefined) diag.mapOff = Math.hypot(ring.x - expected.x, ring.y - expected.y);
  };

  /** Show the ring at a screen point and find it in the picture, looking around `expected` (roi px). */
  /**
   * Show the ring at a screen point and find it in the picture, looking around `expected` (roi px). The camera's
   * picture can lag behind the screen by more than the settle time, and a frame that still shows the ring where
   * it was last time would have the gap measured from the old place and corrected twice over: so when the ring
   * was expected to move and is found where an earlier one was, or is not seen at all, wait and take the frame
   * again, a few times.
   */
  const seen: Pt[] = []; // every ring found for this point so far, in roi px
  const seeRing = async (at: Pt, expected: Pt, knownRadius?: number): Promise<RingFound | string> => {
    await host.showRing(at);
    await wait(host.settleMs);
    for (let take = 0; ; take++) {
      const ringed = await host.grab(roi);
      if (!ringed) return 'no camera picture';
      diag.ringed = ringed;
      const near = { ...expected, r: RING_REACH };
      // the ring's radius in the picture: as drawn, times the camera's scale here, corrected by rings seen whole so far
      const scale = localScale(h, at);
      const expectRadius = knownRadius ?? scale * median(memory.ringScales, RING_MEAN);
      const ring = darkenedCentroid(lit, ringed, RING_PIXELS, 10, near, expectRadius);
      diag.ring = ring;
      const canRetake = take < MAX_RETAKES;
      if (!ring) {
        // no ring at all can be the picture not having caught up with the screen yet
        if (canRetake) {
          diag.retakes++;
          await wait(host.settleMs);
          continue;
        }
        const seen = darkenedCentroid(lit, ringed, 1, 10, near);
        return `the ring was not seen in the picture (${seen?.n ?? 0} pixels darkened, ${RING_PIXELS} needed)`;
      }
      if (ring.spread > RING_SPREAD) return `what darkened was scattered, not a ring (spread ${Math.round(ring.spread)} px, ${RING_SPREAD} at most)`;
      // a ring found exactly where an earlier ring of this point was, when this one should be elsewhere, is the
      // old picture: the ring at its last place, or the other stepped-in ring
      const stale = seen.some((s) => Math.hypot(ring.x - s.x, ring.y - s.y) < STALE_STILL && Math.hypot(expected.x - s.x, expected.y - s.y) > STALE_MOVE);
      if (stale && canRetake) {
        diag.retakes++;
        await wait(host.settleMs);
        continue;
      }
      if (ring.radius && ring.coverage >= 0.9 && scale > 0) memory.ringScales.push(ring.radius / scale);
      seen.push({ x: ring.x, y: ring.y });
      return ring;
    }
  };
  const inRoi = (q: Pt): Pt => {
    const c = applyHomography(h, q);
    return { x: c.x - roi.x, y: c.y - roi.y };
  };

  let gap = NaN;
  // where the ring should land: first where the corners say, then on the dot it was sent towards
  let expected = guessInRoi;
  let stalls = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (host.stopped()) return finish({ i, j, ok: false, gap, reason: 'stopped' });
    let ring: Pt;
    if (inward) {
      const stepped = ' (the rings for a corner or edge point are shown a step in from it, so the mat must be clear there)';
      const first = await seeRing(add(p, inward), inRoi(add(p, inward)));
      if (typeof first === 'string') return finish({ i, j, ok: false, gap, reason: first + stepped });
      noteMap(first, inRoi(add(p, inward)));
      const second = await seeRing(add(p, inward, 2), inRoi(add(p, inward, 2)));
      if (typeof second === 'string') return finish({ i, j, ok: false, gap, reason: second + stepped });
      // Both rings must be whole, and as far apart in the picture as the map says they should be: a ring half
      // under something on the mat gives a centre that is off, and the position worked out from the two would be
      // off by twice as much.
      const partial = [first, second].find((r) => r.coverage < 0.75);
      if (partial) {
        return finish({ i, j, ok: false, gap, reason: `a stepped-in ring was not whole (${Math.round(partial.coverage * 100)}% of it seen): something on the mat a step in from the point?` });
      }
      const u = { x: inRoi(add(p, inward, 2)).x - inRoi(add(p, inward)).x, y: inRoi(add(p, inward, 2)).y - inRoi(add(p, inward)).y };
      const v = { x: second.x - first.x, y: second.y - first.y };
      const off = Math.hypot(v.x - u.x, v.y - u.y);
      if (off > 0.35 * Math.hypot(u.x, u.y)) {
        return finish({ i, j, ok: false, gap, reason: `the two stepped-in rings were not where they should be relative to each other (${off.toFixed(1)} px out): something on the mat a step in from the point?` });
      }
      const extrapolated = { x: 2 * first.x - second.x, y: 2 * first.y - second.y };
      ring = extrapolated;
      // The straight-line guess from the two rings assumes the mat is flat over those two steps; over a dip at
      // the edge it lands short or long. The whole rings give the ring's exact size here, and with the size
      // known the part of the ring that shows at the point itself can be fitted properly: use that when enough
      // of it shows, and keep the guess as the fallback (a dim corner may show too little).
      const radius = first.radius && second.radius ? (first.radius + second.radius) / 2 : null;
      if (radius) {
        const direct = await seeRing(p, extrapolated, radius);
        if (typeof direct !== 'string') {
          const delta = Math.hypot(direct.x - extrapolated.x, direct.y - extrapolated.y);
          const used = direct.coverage >= DIRECT_COVERAGE && delta <= DIRECT_AGREE;
          diag.check = { x: direct.x, y: direct.y, coverage: direct.coverage, delta, used };
          if (used) ring = { x: direct.x, y: direct.y };
        }
      }
      diag.ring = { ...first, x: ring.x, y: ring.y };
    } else {
      const found = await seeRing(p, expected);
      if (typeof found === 'string') return finish({ i, j, ok: false, gap, reason: found });
      noteMap(found, guessInRoi);
      ring = found;
    }
    const dot = dotNear(lit, ring, reach, DOT_SCORE);
    diag.dot = dot;
    if (!dot) {
      const best = dotNear(lit, ring, reach, 0, 1)?.peak ?? 0;
      const why = best >= DOT_SCORE ? `only a speck of orange, not a dot` : `best orange score ${Math.round(best)}, ${DOT_SCORE} needed`;
      return finish({ i, j, ok: false, gap, reason: `no dot within ${Math.round(reach)} px of the ring (${why})` });
    }
    if (dot.spread > DOT_SPREAD) {
      return finish({ i, j, ok: false, gap, reason: `the orange near the ring is a line or a smear, not a dot (spread ${Math.round(dot.spread)} px, ${DOT_SPREAD} at most)` });
    }
    expected = { x: dot.x, y: dot.y };
    const ringCam = { x: ring.x + roi.x, y: ring.y + roi.y };
    const dotCam = { x: dot.x + roi.x, y: dot.y + roi.y };
    const was = gap;
    gap = Math.hypot(dotCam.x - ringCam.x, dotCam.y - ringCam.y);
    host.progress(`${gap.toFixed(1)} px off`);
    if (gap <= DONE_GAP) break;
    // the last go only measures: a point is never left on a move that was not looked at
    if (round === MAX_ROUNDS - 1) break;
    // each go should take most of the gap away; two goes running that do not close it mean the dot found is not
    // the one under the ring (one go can be noise, a ring cut off by the screen's edge being seen less surely)
    if (round > 0 && gap > was * 0.7 + DONE_GAP) {
      if (++stalls >= 2) {
        return finish({ i, j, ok: false, gap, reason: `the ring and the dot were not closing in (${was.toFixed(1)} px off, then ${gap.toFixed(1)})` });
      }
    } else stalls = 0;
    const step = correction(h, p, ringCam, dotCam);
    const len = Math.hypot(step.x, step.y);
    if (len === 0) return finish({ i, j, ok: false, gap, reason: 'the map gives no direction to move' });
    const k = len > MAX_STEP ? MAX_STEP / len : 1;
    const next = { x: p.x + step.x * k, y: p.y + step.y * k };
    const travel = Math.hypot(next.x - start.x, next.y - start.y);
    if (travel > MAX_TRAVEL) {
      return finish({ i, j, ok: false, gap, reason: `it would have moved ${Math.round(travel)} px on screen, more than the ${MAX_TRAVEL} trusted` });
    }
    p = next;
    host.setPoint(i, j, p);
  }
  await host.showRing(null);
  // Not settled to the half pixel but close: keep it, it is better than where it started. Further out than that
  // after all the goes, the point goes back, since a wrong dot or a wobbling measurement is the likelier story.
  return finish({ i, j, ok: gap <= ACCEPT_GAP, gap, reason: gap <= ACCEPT_GAP ? undefined : `did not settle (${gap.toFixed(1)} px off after ${MAX_ROUNDS} goes)` });
}

/** The middle value, or `fallback` with nothing to take it from. */
function median(values: number[], fallback: number): number {
  if (!values.length) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Set every point given, in order, and say how it went. */
export async function autoCalibrate(host: AutoHost, points: Array<{ i: number; j: number }>, label: (i: number, j: number) => string): Promise<AutoOutcome[]> {
  const outcomes: AutoOutcome[] = [];
  const memory: AutoMemory = { ringScales: [] };
  // The screen has just gone white: give the camera's exposure time to settle on it before the first frames
  // are compared, or the first point's plain frame is brighter than its ringed ones.
  await host.showRing(null);
  await wait(host.settleMs * 3);
  for (let n = 0; n < points.length; n++) {
    if (host.stopped()) break;
    const { i, j } = points[n]!;
    host.progress(`${label(i, j)} (${n + 1} of ${points.length})`);
    outcomes.push(await autoPoint(host, i, j, memory));
  }
  await host.showRing(null);
  return outcomes;
}

/** One line for the hint when it is done. */
export function summarise(outcomes: AutoOutcome[], label: (i: number, j: number) => string): string {
  const ok = outcomes.filter((o) => o.ok);
  const missed = outcomes.filter((o) => !o.ok);
  if (!outcomes.length) return 'Nothing was set.';
  let text = `${ok.length} of ${outcomes.length} points set from the camera.`;
  if (missed.length) {
    const reasons = new Map<string, string[]>();
    for (const o of missed) {
      const r = o.reason ?? 'not set';
      reasons.set(r, [...(reasons.get(r) ?? []), label(o.i, o.j)]);
    }
    text += ' Left as they were: ' + [...reasons].map(([r, labels]) => `${labels.join(', ')} (${r})`).join('; ') + '.';
  }
  const offs = outcomes.map((o) => o.mapOff).filter((m): m is number => m !== undefined && Number.isFinite(m));
  const rough = median(offs, 0);
  if (rough > MAP_ROUGH) {
    text += ` The camera's corners put the rings about ${Math.round(rough)} px from where they appeared, which is rough: each point was matched to the dot nearest its ring, never further than a share of the gap between dots, so a point further than that from its dot is left for you to drag closer. Finding the corners again, zoomed in on each, may make the map truer.`;
  }
  return text;
}
