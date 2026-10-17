// Reading lengths and sizes out of SVG files in the browser: Grain-Nest
// exports (seam lines, for the Thread calculator) and pattern SVGs (piece
// sizes, for the Yardage estimate). The SVG is parsed and put in a hidden
// box so the browser can measure paths; nothing is kept.

import { cmPerUnit, countFor, parsePieceName } from './calc/gncodes';

function mount(text: string): { svg: SVGSVGElement; scale: number; unmount: () => void } | null {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName !== 'svg' || doc.querySelector('parsererror')) return null;
  const vb = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  const scale = cmPerUnit(svg.getAttribute('width'), vb && vb.length === 4 ? vb[2]! : null);
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-100000px;top:0;width:1px;height:1px;overflow:hidden;visibility:hidden';
  const node = document.importNode(svg, true) as unknown as SVGSVGElement;
  box.append(node);
  document.body.append(box);
  return { svg: node, scale, unmount: () => box.remove() };
}

export interface SeamsResult {
  /** Seam length to sew: half the sew-line length, since a seam joins two edges. */
  seams: number;
  pieces: number;
  source: 'sew' | 'cut';
}

/** Total seam length from a Grain-Nest export (sew-N paths) or, failing that, from cutting lines. */
export function seamsFromSvg(text: string): SeamsResult | null {
  const m = mount(text);
  if (!m) return null;
  try {
    let paths = [...m.svg.querySelectorAll<SVGGeometryElement>('path[id^="sew-"], [id^="sew-"] path')];
    let source: SeamsResult['source'] = 'sew';
    if (!paths.length) {
      source = 'cut';
      for (const g of m.svg.querySelectorAll('[id^="cut-"]')) {
        const first = g.querySelector('path');
        if (first) paths.push(first);
      }
      if (!paths.length) paths = [...m.svg.querySelectorAll<SVGGeometryElement>('path[id^="piece-"]')];
    }
    if (!paths.length) return null;
    let total = 0;
    for (const p of paths) {
      try {
        total += p.getTotalLength();
      } catch {
        /* a path that cannot be measured */
      }
    }
    return { seams: (total * m.scale) / 2, pieces: paths.length, source };
  } finally {
    m.unmount();
  }
}

export interface PieceSize {
  name: string;
  /** Across the grain, opened out if cut on the fold. */
  width: number;
  /** Along the grain. */
  height: number;
  count: number;
}

/** Piece sizes for one fabric from a pattern SVG with Grain-Nest style names ("7 Skirt Back C2M"). */
export function piecesFromSvg(text: string, fabric: string): PieceSize[] | null {
  const m = mount(text);
  if (!m) return null;
  try {
    const out: PieceSize[] = [];
    const groups = [...m.svg.querySelectorAll<SVGGElement>('g')];
    for (const g of groups) {
      const label = g.getAttribute('inkscape:label') ?? g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ?? g.id.replace(/^group-/, '').replace(/_/g, ' ');
      const parsed = parsePieceName(label);
      if (!parsed || !parsed.codes.length) continue;
      if (/\(mirrored\)/i.test(label)) continue;
      const outline = g.querySelector<SVGGraphicsElement>('path[id^="piece-"], [id^="cut-"] path, path');
      if (!outline) continue;
      let bb: DOMRect;
      try {
        bb = outline.getBBox();
      } catch {
        continue;
      }
      const grain = g.querySelector<SVGGeometryElement>('[id^="grain-"]');
      let vertical = true;
      if (grain) {
        try {
          const a = grain.getPointAtLength(0);
          const b = grain.getPointAtLength(grain.getTotalLength());
          vertical = Math.abs(b.y - a.y) >= Math.abs(b.x - a.x);
        } catch {
          /* keep vertical */
        }
      }
      const across = (vertical ? bb.width : bb.height) * m.scale;
      const along = (vertical ? bb.height : bb.width) * m.scale;
      const { count, onFold } = countFor(parsed.codes, fabric);
      if (!count) continue;
      out.push({ name: parsed.number !== null ? `${parsed.number} ${parsed.name}` : parsed.name, width: onFold ? across * 2 : across, height: along, count });
    }
    return out;
  } finally {
    m.unmount();
  }
}
