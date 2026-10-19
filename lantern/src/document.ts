// Opening a pattern: a PDF (through pdf.js's legacy build, which does not
// assume the newest JavaScript, bundled with its worker so the
// page works from a saved file) or an SVG such as a Grain-Nest export or a
// calibration card. Either becomes a picture of one page drawn at a known
// number of pixels per centimetre, plus the page's size in cm and its layers,
// so the renderer can put it on the table at true size.

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerSource from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?raw';
import type { PageSize } from './calc/placement';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
}

export interface Rendered {
  canvas: HTMLCanvasElement;
  /** Pixels per centimetre the canvas was drawn at. */
  pxPerCm: number;
  size: PageSize;
}

export interface Opened {
  name: string;
  kind: 'pdf' | 'svg';
  pages: number;
  /** Page sizes in cm, one per page. */
  sizes: PageSize[];
  layers: Layer[];
  /** Draw a page with the layers' current visibility at about `pxPerCm`; the result says what it actually used. */
  render(page: number, pxPerCm: number, maxPx: number): Promise<Rendered>;
  close(): void;
}

const PT_PER_CM = 72 / 2.54;

let workerReady = false;
function ensureWorker(): void {
  if (workerReady) return;
  workerReady = true;
  try {
    const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(url, { type: 'module' });
  } catch {
    /* no Worker (very old browser): pdf.js falls back to the main thread */
  }
}

async function openPdf(file: File): Promise<Opened> {
  ensureWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const sizes: PageSize[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    sizes.push({ width: vp.width / PT_PER_CM, height: vp.height / PT_PER_CM });
  }
  const config = await doc.getOptionalContentConfig();
  const layers: Layer[] = [];
  const walk = (order: unknown[]) => {
    for (const item of order) {
      if (typeof item === 'string') {
        const g = config.getGroup(item) as { name?: string; visible?: boolean } | null;
        if (g) layers.push({ id: item, name: g.name || `Layer ${layers.length + 1}`, visible: g.visible !== false });
      } else if (item && typeof item === 'object' && Array.isArray((item as { order?: unknown[] }).order)) {
        walk((item as { order: unknown[] }).order);
      }
    }
  };
  const order = config.getOrder() as unknown[] | null;
  if (Array.isArray(order)) walk(order);
  return {
    name: file.name,
    kind: 'pdf',
    pages: doc.numPages,
    sizes,
    layers,
    async render(pageNo, pxPerCm, maxPx) {
      const page = await doc.getPage(pageNo);
      const size = sizes[pageNo - 1]!;
      const scale = Math.min(pxPerCm, maxPx / Math.max(size.width, size.height));
      const vp = page.getViewport({ scale: scale / PT_PER_CM });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(vp.width));
      canvas.height = Math.max(1, Math.round(vp.height));
      const ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const l of layers) config.setVisibility(l.id, l.visible);
      await page.render({ canvas, viewport: vp, optionalContentConfigPromise: Promise.resolve(config) }).promise;
      return { canvas, pxPerCm: scale, size };
    },
    close() {
      doc.destroy().catch(() => {});
    },
  };
}

const SVG_UNITS: Record<string, number> = { mm: 0.1, cm: 1, in: 2.54, pt: 2.54 / 72, pc: 2.54 / 6, px: 2.54 / 96, '': 2.54 / 96 };

/** An SVG length attribute in cm; null if it is missing or a percentage. */
export function svgLengthCm(text: string | null): number | null {
  if (!text) return null;
  const m = /^\s*([0-9.]+)\s*([a-z]*)\s*$/i.exec(text);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  const f = SVG_UNITS[m[2]!.toLowerCase()];
  return f === undefined || !(n > 0) ? null : n * f;
}

/** The page size of an SVG from its width/height, or its viewBox read as mm the way Grain-Nest writes them. */
export function svgSize(svg: SVGSVGElement): PageSize | null {
  const w = svgLengthCm(svg.getAttribute('width'));
  const h = svgLengthCm(svg.getAttribute('height'));
  if (w && h) return { width: w, height: h };
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2]! > 0 && vb[3]! > 0) return { width: vb[2]! / 10, height: vb[3]! / 10 };
  return null;
}

const INKSCAPE = 'http://www.inkscape.org/namespaces/inkscape';

/** Inkscape layers (top-level groups marked groupmode="layer"), in document order. */
export function svgLayers(svg: SVGSVGElement): Element[] {
  return Array.from(svg.children).filter((el) => el.localName === 'g' && el.getAttributeNS(INKSCAPE, 'groupmode') === 'layer');
}

async function openSvg(file: File): Promise<Opened> {
  const text = await file.text();
  const dom = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = dom.documentElement as unknown as SVGSVGElement;
  if (svg.localName !== 'svg') throw new Error('Not an SVG file');
  const size = svgSize(svg);
  if (!size) throw new Error('The SVG has no size in mm, cm or inches');
  svg.setAttribute('width', `${size.width}cm`);
  svg.setAttribute('height', `${size.height}cm`);
  const groups = svgLayers(svg);
  const layers: Layer[] = groups.map((g, i) => ({
    id: String(i),
    name: g.getAttributeNS(INKSCAPE, 'label') || g.getAttribute('id') || `Layer ${i + 1}`,
    visible: !/display\s*:\s*none/.test(g.getAttribute('style') || ''),
  }));
  return {
    name: file.name,
    kind: 'svg',
    pages: 1,
    sizes: [size],
    layers,
    async render(_page, pxPerCm, maxPx) {
      const scale = Math.min(pxPerCm, maxPx / Math.max(size.width, size.height));
      groups.forEach((g, i) => {
        const style = (g.getAttribute('style') || '').replace(/display\s*:\s*[^;]+;?/g, '');
        g.setAttribute('style', layers[i]!.visible ? style : `${style};display:none`);
      });
      const blob = new Blob([new XMLSerializer().serializeToString(dom)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('The SVG could not be drawn'));
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(size.width * scale));
        canvas.height = Math.max(1, Math.round(size.height * scale));
        const ctx = canvas.getContext('2d', { alpha: false })!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return { canvas, pxPerCm: scale, size };
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    close() {},
  };
}

export async function openFile(file: File): Promise<Opened> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.svg') || file.type === 'image/svg+xml') return openSvg(file);
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return openPdf(file);
  throw new Error('Choose a PDF or an SVG');
}
