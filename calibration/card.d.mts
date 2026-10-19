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
