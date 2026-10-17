// A quick yardage estimate from the sizes of the pattern pieces, for patterns
// with no envelope figure. Area plus waste, not a real layout: Grain-Nest
// does that. Lengths in cm.

import { roundUpToBuy, type Unit } from '../units';

export interface Piece {
  w: number;
  h: number;
  count: number;
}

export interface ParsedPieces {
  pieces: Piece[];
  /** Lines that could not be read. */
  bad: string[];
}

/**
 * One piece a line: "30 x 60", "30 × 60 x2", "30 60 2", "front 30x60 ×2".
 * The first two numbers are the size, a trailing "x2" or third number the count.
 * Numbers are in the given unit.
 */
export function parsePieces(text: string, toCm: (n: number) => number): ParsedPieces {
  const pieces: Piece[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const nums = line.replace(/[×x*]/gi, ' ').match(/\d+(?:[.,]\d+)?/g)?.map((n) => parseFloat(n.replace(',', '.'))) ?? [];
    if (nums.length < 2) {
      bad.push(line);
      continue;
    }
    const [w, h] = nums as [number, number];
    const count = nums.length >= 3 ? Math.max(1, Math.round(nums[2]!)) : 1;
    if (!(w > 0) || !(h > 0)) {
      bad.push(line);
      continue;
    }
    pieces.push({ w: toCm(w), h: toCm(h), count });
  }
  return { pieces, bad };
}

/** Rewrite the numbers in a pieces list from one unit to the other, keeping names and counts. */
export function convertPieces(text: string, factor: number): string {
  return text
    .split(/\n/)
    .map((line) => {
      let seen = 0;
      return line.replace(/\d+(?:[.,]\d+)?/g, (n) => {
        seen++;
        if (seen > 2) return n;
        const v = parseFloat(n.replace(',', '.')) * factor;
        return (Math.round(v * 10) / 10).toString();
      });
    })
    .join('\n');
}

export interface YardageResult {
  /** Total area of the pieces in cm². */
  area: number;
  /** Fabric length to buy, waste included and rounded up. */
  length: number;
  /** The widest piece, to check it fits the fabric. */
  widest: number;
  fits: boolean;
}

export function yardage(pieces: Piece[], fabricWidth: number, waste: number, unit: Unit): YardageResult | null {
  if (!pieces.length || !(fabricWidth > 0) || waste < 0) return null;
  const area = pieces.reduce((a, p) => a + p.w * p.h * p.count, 0);
  const widest = Math.max(...pieces.map((p) => Math.min(p.w, p.h)));
  const raw = (area / fabricWidth) * (1 + waste);
  return { area, length: roundUpToBuy(raw, unit), widest, fits: widest <= fabricWidth };
}
