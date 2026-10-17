// Reading Grain-Nest's conventions: piece names with cut codes, SVG units,
// and the cut list text. Pure functions; the DOM work is in src/svgfiles.ts.

export interface CutCode {
  count: number;
  /** Fabric letter(s): M main, L lining, I interfacing, C contrast … */
  fabric: string;
  onFold: boolean;
}

export interface PieceName {
  number: number | null;
  name: string;
  codes: CutCode[];
}

/** "7 Skirt Back C2M", "1 Bodice Front C1MOF", "4 Neck Facing C1M C1I" */
export function parsePieceName(label: string): PieceName | null {
  const s = label.replace(/\s*\(mirrored\)\s*$/i, '').trim();
  if (!s) return null;
  const words = s.split(/\s+/);
  const codes: CutCode[] = [];
  while (words.length) {
    const m = /^C(\d+)([A-Z]+?)(OF)?$/i.exec(words[words.length - 1]!);
    if (!m) break;
    codes.unshift({ count: parseInt(m[1]!, 10), fabric: m[2]!.toUpperCase(), onFold: !!m[3] });
    words.pop();
  }
  let number: number | null = null;
  if (words.length && /^\d+$/.test(words[0]!)) number = parseInt(words.shift()!, 10);
  return { number, name: words.join(' '), codes };
}

/** How many to cut of a fabric, from the codes; on-fold pieces count once (as the opened piece). */
export function countFor(codes: CutCode[], fabric: string): { count: number; onFold: boolean } {
  let count = 0;
  let onFold = false;
  for (const c of codes) {
    if (c.fabric !== fabric.toUpperCase()) continue;
    count += c.count;
    onFold = onFold || c.onFold;
  }
  return { count, onFold };
}

/**
 * Centimetres per SVG user unit, from the root element's width and viewBox.
 * Grain-Nest patterns say width="1600.0mm" with a viewBox of 1600 units; its
 * exports say width in mm over a viewBox in 96-dpi pixels.
 */
export function cmPerUnit(width: string | null, viewBoxWidth: number | null): number {
  const m = width ? /^\s*([\d.]+)\s*(mm|cm|in|px|pt)?\s*$/i.exec(width) : null;
  if (m && viewBoxWidth && viewBoxWidth > 0) {
    const n = parseFloat(m[1]!);
    const unit = (m[2] ?? 'px').toLowerCase();
    const cm = unit === 'mm' ? n / 10 : unit === 'cm' ? n : unit === 'in' ? n * 2.54 : unit === 'pt' ? (n / 72) * 2.54 : (n / 96) * 2.54;
    return cm / viewBoxWidth;
  }
  return 2.54 / 96;
}

export interface CutItem {
  name: string;
  count: number;
}

/**
 * Pieces from a Grain-Nest cut list, or any pasted list: one a line, with a
 * trailing "×2" or "x2" for the count. Headings, sheet totals and rules are
 * skipped.
 */
export function parseCutList(text: string): CutItem[] {
  const items: CutItem[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^total fabric/i.test(line)) break;
    if (/^(grain-nest cut list|generated:|pieces$|sheet \d|pieces placed:|length used:|utilisation:|total fabric|[=\-]{3,}|\(none placed\))/i.test(line)) continue;
    if (/^[\w ]+:\s*\S/.test(line) && !/[×x]\s*\d+$/i.test(line)) continue;
    // "×2" anywhere at the end; a plain "x2" only after a space, so "Box 2" keeps its name
    const m = /^(.*?)(?:\s*×\s*(\d+)|\s+x\s*(\d+))?$/i.exec(line);
    if (!m) continue;
    const name = m[1]!.replace(/\.svg\b/i, '').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const n = m[2] ?? m[3];
    items.push({ name, count: n ? Math.max(1, parseInt(n, 10)) : 1 });
  }
  return items;
}
