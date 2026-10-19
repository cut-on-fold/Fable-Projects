// Where the pattern page sits on the table. Page coordinates are centimetres
// from the page's top-left corner; the placement says where the page's
// centre is on the table, how it is turned, whether it is flipped, and the
// scale (1 is true size). Everything is in table centimetres, so moving the
// pattern is the same whether the table is flat or not: the mesh takes care
// of the screen.

import { applyAffine, invert, multiply, rotation, scaling, translation, type Mat3, type Pt } from './homography';

export interface Placement {
  /** Table position (cm) of the page centre. */
  x: number;
  y: number;
  /** Degrees clockwise. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  /** 1 is true size; 1.05 prints 5% larger. */
  scale: number;
}

export interface PageSize {
  /** cm */
  width: number;
  height: number;
}

/** The page centred on the table, upright, true size. */
export function centred(table: PageSize): Placement {
  return { x: table.width / 2, y: table.height / 2, rotation: 0, flipX: false, flipY: false, scale: 1 };
}

/** The affine map page cm → table cm. */
export function pageToTable(p: Placement, page: PageSize): Mat3 {
  let m = translation(p.x, p.y);
  m = multiply(m, rotation(p.rotation));
  m = multiply(m, scaling(p.scale * (p.flipX ? -1 : 1), p.scale * (p.flipY ? -1 : 1)));
  m = multiply(m, translation(-page.width / 2, -page.height / 2));
  return m;
}

/** The affine map table cm → page cm. */
export function tableToPage(p: Placement, page: PageSize): Mat3 {
  const inv = invert(pageToTable(p, page));
  if (!inv) throw new Error('scale of zero');
  return inv;
}

/** The page's corners on the table: top-left, top-right, bottom-right, bottom-left of the page. */
export function pageCorners(p: Placement, page: PageSize): [Pt, Pt, Pt, Pt] {
  const m = pageToTable(p, page);
  return [
    applyAffine(m, { x: 0, y: 0 }),
    applyAffine(m, { x: page.width, y: 0 }),
    applyAffine(m, { x: page.width, y: page.height }),
    applyAffine(m, { x: 0, y: page.height }),
  ];
}

export function moved(p: Placement, dx: number, dy: number): Placement {
  return { ...p, x: p.x + dx, y: p.y + dy };
}

/** Turned by `degrees` about the page centre, kept within 0–360. */
export function rotated(p: Placement, degrees: number): Placement {
  const r = (((p.rotation + degrees) % 360) + 360) % 360;
  return { ...p, rotation: Math.round(r * 1000) / 1000 };
}

/** Mirrored left to right as seen on the table, whatever the rotation. */
export function flippedAcross(p: Placement): Placement {
  // A flip of the page's x axis after the rotation equals a flip before it with the angle negated.
  return { ...p, flipX: !p.flipX, rotation: ((-p.rotation % 360) + 360) % 360 };
}

/** Mirrored top to bottom as seen on the table. */
export function flippedDown(p: Placement): Placement {
  return { ...p, flipY: !p.flipY, rotation: ((-p.rotation % 360) + 360) % 360 };
}

export function parsePlacement(raw: unknown): Placement | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Placement>;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!num(p.x) || !num(p.y) || !num(p.rotation) || !num(p.scale) || !(p.scale! > 0)) return null;
  return { x: p.x!, y: p.y!, rotation: p.rotation!, flipX: !!p.flipX, flipY: !!p.flipY, scale: p.scale! };
}
