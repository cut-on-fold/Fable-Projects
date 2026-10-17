// Thread estimate: how much thread a project's seams use, by stitch type, and
// how many spools that is. Lengths in cm. The ratios are the thread-maker
// consumption figures (thread used per length of seam) for ordinary stitch
// lengths on medium fabric; thick fabric and short stitches use more.

export interface StitchKind {
  id: string;
  name: string;
  /** Thread used per unit of seam, all threads together. */
  ratio: number;
  /** How the total splits across the threads, in order. */
  split: Array<{ name: string; share: number }>;
}

export const STITCH_KINDS: StitchKind[] = [
  { id: 'lock', name: 'Straight stitch (lockstitch)', ratio: 2.7, split: [{ name: 'Top', share: 0.5 }, { name: 'Bobbin', share: 0.5 }] },
  { id: 'zigzag', name: 'Zigzag', ratio: 5, split: [{ name: 'Top', share: 0.5 }, { name: 'Bobbin', share: 0.5 }] },
  { id: 'ol3', name: '3-thread overlock', ratio: 14, split: [{ name: 'Needle', share: 0.18 }, { name: 'Upper looper', share: 0.41 }, { name: 'Lower looper', share: 0.41 }] },
  { id: 'ol4', name: '4-thread overlock', ratio: 18, split: [{ name: 'Left needle', share: 0.14 }, { name: 'Right needle', share: 0.14 }, { name: 'Upper looper', share: 0.36 }, { name: 'Lower looper', share: 0.36 }] },
  { id: 'cover', name: '2-needle coverstitch', ratio: 9, split: [{ name: 'Left needle', share: 0.25 }, { name: 'Right needle', share: 0.25 }, { name: 'Looper', share: 0.5 }] },
  { id: 'rolled', name: 'Rolled hem (3-thread)', ratio: 16, split: [{ name: 'Needle', share: 0.15 }, { name: 'Upper looper', share: 0.55 }, { name: 'Lower looper', share: 0.3 }] },
];

export interface ThreadResult {
  /** Thread for the seams, waste included. */
  total: number;
  perThread: Array<{ name: string; length: number; spools: number }>;
  /** Spools of the biggest single thread, which is what you run out of. */
  spools: number;
}

/**
 * @param seams total seam length to sew with this stitch
 * @param waste share added for tails, backstitching, chain-off and unpicking
 * @param spool length of thread on one spool
 */
export function threadNeeded(seams: number, kind: StitchKind, waste: number, spool: number): ThreadResult | null {
  if (!(seams > 0) || waste < 0) return null;
  const total = seams * kind.ratio * (1 + waste);
  const perThread = kind.split.map((s) => {
    const length = total * s.share;
    return { name: s.name, length, spools: spool > 0 ? Math.ceil(length / spool - 1e-9) : 0 };
  });
  return { total, perThread, spools: Math.max(0, ...perThread.map((p) => p.spools)) };
}

/** Typical total seam lengths, as a prompt for the seams field. In cm. */
export const TYPICAL_SEAMS: Array<{ name: string; length: number }> = [
  { name: 'T-shirt', length: 450 },
  { name: 'Leggings', length: 500 },
  { name: 'Shirt or blouse', length: 900 },
  { name: 'Trousers', length: 1000 },
  { name: 'Dress', length: 1000 },
  { name: 'Jeans (seams and topstitching)', length: 1600 },
  { name: 'Lined jacket', length: 1800 },
];
