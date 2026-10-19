import { describe, expect, it } from 'vitest';
import { applyAffine, type Pt } from '../src/calc/homography';
import { centred, flippedAcross, flippedDown, moved, pageCorners, pageToTable, parsePlacement, rotated, tableToPage } from '../src/calc/placement';

const close = (a: Pt, b: Pt) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};
const table = { width: 90, height: 60 };
const a4 = { width: 21, height: 29.7 };

describe('placement', () => {
  it('starts centred and true size', () => {
    const p = centred(table);
    const [tl, , br] = pageCorners(p, a4);
    close(tl, { x: 45 - 10.5, y: 30 - 14.85 });
    close(br, { x: 45 + 10.5, y: 30 + 14.85 });
  });
  it('moves in table centimetres', () => {
    const p = moved(centred(table), 10, -5);
    close(pageCorners(p, a4)[0], { x: 44.5, y: 10.15 });
  });
  it('turns about the page centre', () => {
    const p = rotated(centred(table), 90);
    const [tl, tr] = pageCorners(p, a4);
    // the page's top edge now runs down the table's right-hand side of the centre
    close(tl, { x: 45 + 14.85, y: 30 - 10.5 });
    close(tr, { x: 45 + 14.85, y: 30 + 10.5 });
    expect(rotated(p, 300).rotation).toBe(30);
    expect(rotated(p, -100).rotation).toBe(350);
  });
  it('flips as seen on the table whatever the rotation', () => {
    const p = rotated(moved(centred(table), 3, 4), 37);
    const before = pageCorners(p, a4);
    const across = pageCorners(flippedAcross(p), a4);
    for (let i = 0; i < 4; i++) close(across[i]!, { x: 2 * p.x - before[i]!.x, y: before[i]!.y });
    const down = pageCorners(flippedDown(p), a4);
    for (let i = 0; i < 4; i++) close(down[i]!, { x: before[i]!.x, y: 2 * p.y - before[i]!.y });
    expect(flippedAcross(flippedAcross(p))).toEqual(p);
  });
  it('scales about the centre', () => {
    const p = { ...centred(table), scale: 2 };
    close(pageCorners(p, a4)[0], { x: 45 - 21, y: 30 - 29.7 });
  });
  it('tableToPage is the inverse', () => {
    const p = { ...rotated(moved(centred(table), 3, 4), 37), flipX: true, scale: 1.05 };
    const m = pageToTable(p, a4);
    const inv = tableToPage(p, a4);
    close(applyAffine(inv, applyAffine(m, { x: 5, y: 7 })), { x: 5, y: 7 });
    expect(() => tableToPage({ ...p, scale: 0 }, a4)).toThrow();
  });
  it('reads a stored placement back or rejects it', () => {
    const p = rotated(centred(table), 90);
    expect(parsePlacement(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(parsePlacement({ x: 1, y: 2 })).toBeNull();
    expect(parsePlacement({ ...p, scale: 0 })).toBeNull();
  });
});
