// Types for card.mjs, for Lantern's typecheck.
export const IN: number;
export function r(n: number): number;
export function wrap(text: string, chars: number): string[];
export interface CardSpec {
  /** mm */
  width: number;
  height: number;
  name: string;
  purpose: string;
  /** 'cm' (default) or 'in' for the grid. */
  unit?: 'cm' | 'in';
}
/** One calibration card as an SVG document. */
export function card(spec: CardSpec): string;
/** Whole steps from the near edge, then the far edge. */
export function stops(length: number, step: number): number[];
export interface LayoutSpec {
  /** mm */
  width: number;
  height: number;
  name: string;
  purpose: string;
  /** mm; default 12 in */
  lineEvery?: number;
  /** mm; default 6 in */
  dotEvery?: number;
  /** dot diameter, mm; default 8 */
  dot?: number;
}
/** A layout for drawing a mat: lines and dot targets, as an SVG document. */
export function layout(spec: LayoutSpec): string;
export interface TileSpec {
  /** mm */
  width: number;
  height: number;
  name: string;
  purpose: string;
  /** mm; default 6 in */
  cell?: number;
  /** dot diameter, mm; default 8 */
  dot?: number;
}
/** A page to print with a cell of dot targets, as an SVG document. */
export function tile(spec: TileSpec): string;
export interface DotsSpec {
  name: string;
  /** default 10 × 10 */
  columns?: number;
  rows?: number;
  /** dot diameter, mm; default 8 */
  dot?: number;
  /** centre to centre, mm; default 12 */
  pitch?: number;
}
/** A sheet of filled circles to cut from vinyl, as an SVG document. */
export function dots(spec: DotsSpec): string;
