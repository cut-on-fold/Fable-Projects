import { describe, expect, it } from 'vitest';
import { STITCH_KINDS, threadNeeded } from '../src/calc/thread';
import { allowanceChange, finishedFromFlat } from '../src/calc/allowance';

describe('thread', () => {
  const lock = STITCH_KINDS.find((k) => k.id === 'lock')!;
  const ol4 = STITCH_KINDS.find((k) => k.id === 'ol4')!;
  it('a 10 m of straight seams uses about 31 m with waste', () => {
    const r = threadNeeded(1000, lock, 0.15, 10000)!;
    expect(r.total).toBeCloseTo(3105);
    expect(r.perThread.map((p) => p.name)).toEqual(['Top', 'Bobbin']);
    expect(r.perThread[0]!.length).toBeCloseTo(1552.5);
    expect(r.spools).toBe(1);
  });
  it('a 4-thread overlock splits across four cones and the loopers run out first', () => {
    const r = threadNeeded(1000, ol4, 0, 250000)!;
    expect(r.total).toBe(18000);
    expect(r.perThread.map((p) => p.spools)).toEqual([1, 1, 1, 1]);
    const small = threadNeeded(5000, ol4, 0, 10000)!;
    // loopers 5000 × 18 × 0.36 = 32400 → 4 spools; needles 12600 → 2
    expect(small.perThread.map((p) => p.spools)).toEqual([2, 2, 4, 4]);
    expect(small.spools).toBe(4);
  });
  it('every stitch kind splits to one', () => {
    for (const k of STITCH_KINDS) expect(k.split.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1);
  });
  it('rejects nothing to sew', () => {
    expect(threadNeeded(0, lock, 0.1, 100)).toBeNull();
  });
});

describe('allowances', () => {
  it('trim or add', () => {
    expect(allowanceChange(1.5, 1)!.change).toBeCloseTo(-0.5);
    expect(allowanceChange(1, 1.5)!.change).toBeCloseTo(0.5);
    expect(allowanceChange(1.5, 1.5)!.change).toBe(0);
    expect(allowanceChange(-1, 1)).toBeNull();
  });
  it('a half front measured flat', () => {
    // 25 cm across, 1.5 cm allowance at the side, none at the fold: 1 allowance, times 4 (half front → full front is ×2, plus the back)
    const r = finishedFromFlat(25, 1.5, 1, 4, 90)!;
    expect(r.finished).toBeCloseTo(94);
    expect(r.ease).toBeCloseTo(4);
  });
  it('a full width piece with an allowance each side', () => {
    const r = finishedFromFlat(50, 1.5, 2, 2, null)!;
    expect(r.finished).toBeCloseTo(94);
    expect(r.ease).toBeNull();
    expect(finishedFromFlat(2, 1.5, 2, 2, null)).toBeNull();
  });
});
