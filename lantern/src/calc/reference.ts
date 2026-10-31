// What goes with a pair of reference photos: a description of the grid
// Lantern projected for the first one, in millimetres on the table, and
// what Lantern knows of where the table lands in the camera's picture. The
// photos are for work outside Lantern, so every number is spelt out.

import { applyHomography, homographyFromPoints, invert, rectCorners, type Mat3, type Pt } from './homography';

/** A dot at a table crossing, as Auto saw it in the camera picture. */
export interface DotSeen {
  /** The crossing, in cm from the table's top-left corner. */
  table: Pt;
  /** The dot's centre in the camera picture, in its own pixels. */
  pixel: Pt;
  /** Camera pixels between the ring and the dot when the point was set: how closely the two agreed. */
  gap: number;
}

export interface ReferenceInput {
  version: string;
  /** When the photos were taken, ISO 8601. */
  taken: string;
  table: { name: string; width: number; height: number };
  /** The unit the grid was drawn in. */
  unit: 'cm' | 'in';
  /** The grid's square, and how often a line is drawn heavier, in cm. */
  stepCm: number;
  heavyCm: number;
  camera: {
    label: string | null;
    width: number;
    height: number;
    gridSettings: Record<string, unknown>;
    plainSettings: Record<string, unknown>;
  };
  /** The table's corners (top-left, top-right, bottom-right, bottom-left) in camera pixels, as clicked by eye; null if not found. */
  corners: Pt[] | null;
  dots: DotSeen[];
}

const mm = (cm: number): number => Math.round(cm * 10 * 1000) / 1000;
const px = (v: number): number => Math.round(v * 100) / 100;

/**
 * Where the grid's lines fall along one side, in mm from the corner: every
 * step from 0, and the far edge last, so a table that is not a whole number
 * of squares ends in a short one.
 */
export function gridLinesMm(lengthCm: number, stepCm: number): number[] {
  const out: number[] = [];
  for (let k = 0; k * stepCm < lengthCm - 1e-6; k++) out.push(mm(k * stepCm));
  out.push(mm(lengthCm));
  return out;
}

/** The homography taking table mm to camera pixels, through the four clicked corners; null without them. */
export function tableToCamera(widthCm: number, heightCm: number, corners: Pt[] | null): Mat3 | null {
  if (!corners || corners.length !== 4) return null;
  return homographyFromPoints(rectCorners(mm(widthCm), mm(heightCm)), corners);
}

const matrixRows = (h: Mat3): number[][] => [
  [h[0], h[1], h[2]],
  [h[3], h[4], h[5]],
  [h[6], h[7], h[8]],
];

/** The contents of grid.json. */
export function referenceJson(input: ReferenceInput): Record<string, unknown> {
  const { table, camera } = input;
  const xs = gridLinesMm(table.width, input.stepCm);
  const ys = gridLinesMm(table.height, input.stepCm);
  const wholeAcross = Math.floor(table.width / input.stepCm + 1e-6);
  const wholeDown = Math.floor(table.height / input.stepCm + 1e-6);
  const unitName = input.unit === 'in' ? 'inch' : 'centimetre';
  const h = tableToCamera(table.width, table.height, input.corners);
  const inv = h && invert(h);
  const cornerNames = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const cornerTable = rectCorners(mm(table.width), mm(table.height));
  const same = JSON.stringify(camera.gridSettings) === JSON.stringify(camera.plainSettings);
  const dotResiduals = h ? input.dots.map((d) => {
    const p = applyHomography(h, { x: mm(d.table.x), y: mm(d.table.y) });
    return Math.hypot(p.x - d.pixel.x, p.y - d.pixel.y);
  }) : [];
  const worst = dotResiduals.length ? Math.max(...dotResiduals) : null;

  return {
    about:
      `Reference photos from Lantern v${input.version}. grid.png is the camera's picture with Lantern's grid projected on the table; plain.png is the same picture taken afterwards with the projector off. Both are the camera's frames as they came, ${camera.width} × ${camera.height} pixels, not turned, mirrored, cropped or scaled. Pixel (0, 0) is the top-left of each picture, x runs right and y runs down, and a pixel's position is its centre. Lengths on the table are in millimetres.`,
    taken: input.taken,
    lantern_version: input.version,
    table: {
      name: table.name,
      width_mm: mm(table.width),
      height_mm: mm(table.height),
      note: 'The table is the rectangle Lantern was calibrated to, its corners dragged onto the mat. Table (0, 0) is its top-left corner as projected; x runs along the top edge towards the top-right corner and y down the left edge. The grid and every point below use these table coordinates.',
    },
    grid: {
      square_mm: mm(input.stepCm),
      squares_across: wholeAcross,
      squares_down: wholeDown,
      partial_square_across_mm: mm(table.width - wholeAcross * input.stepCm),
      partial_square_down_mm: mm(table.height - wholeDown * input.stepCm),
      origin: 'Table (0, 0), the top-left corner: the first vertical and the first horizontal line are the table\'s top and left edges. Lines follow every square_mm from there, and the last line in each direction is the far edge of the table, so when the width or height is not a whole number of squares the last square is short by the partial amount given.',
      line_x_mm: xs,
      line_y_mm: ys,
      lines_note: 'line_x_mm are the x positions (mm) of the vertical lines, line_y_mm the y positions of the horizontal ones; every crossing of the two is a grid corner.',
      heavy_line_every_mm: mm(input.heavyCm),
      drawn_as: `Black lines on a white screen, 2 screen pixels wide, with a heavier line (3 pixels) every heavy_line_every_mm. The grid was drawn in ${unitName}s (one ${unitName} squares) through Lantern's calibration, so each line lands on the table where the calibration puts it.`,
    },
    camera: {
      device: camera.label,
      width_px: camera.width,
      height_px: camera.height,
      settings_for_grid_photo: camera.gridSettings,
      settings_for_plain_photo: camera.plainSettings,
      settings_identical: same,
      note: 'The settings are what the browser reports for the camera at each photo (MediaStreamTrack.getSettings()). Both photos come from the same running camera stream, which Lantern did not restart or adjust between them; exposure, focus and white balance are whatever the camera or its own software holds them at, and only settings fixed there (auto exposure, autofocus and auto white balance off) are the same in both pictures.',
    },
    camera_to_table: {
      note: 'Lantern\'s camera is only ever mapped roughly: the four corners of the table are clicked by eye in the camera picture and a single homography (a flat-plane map) is fitted through them. That map is below. It assumes a flat table and an ideal lens, so it is a starting point, good to a few camera pixels; the dots Auto measured, listed under matched_points, are the precise matches.',
      lens_correction: null,
      lens_correction_note: 'Lantern applies no lens correction to the camera picture. Its bendable mesh corrects the projector\'s picture onto the table, not the camera\'s, and is not part of this file.',
      corners: input.corners
        ? input.corners.map((c, k) => ({ corner: cornerNames[k], table_mm: { x: cornerTable[k]!.x, y: cornerTable[k]!.y }, pixel: { x: px(c.x), y: px(c.y) } }))
        : null,
      corners_note: input.corners ? 'Where the table\'s four corners sit in the picture, as clicked by eye in Lantern\'s camera window (Find corners). Rough: a few pixels.' : 'The corners have not been clicked in the camera window, so there is no map from the picture to the table beyond the measured dots.',
      table_mm_to_pixel: h ? matrixRows(h) : null,
      pixel_to_table_mm: inv ? matrixRows(inv) : null,
      matrix_note: 'Row-major 3 × 3 homographies. For a table point (x, y) in mm: [u, v, w] = table_mm_to_pixel · [x, y, 1], and the pixel is (u / w, v / w). pixel_to_table_mm is its inverse, used the same way from a pixel (x, y) to table mm.',
      matched_points: input.dots.map((d, k) => ({
        table_mm: { x: mm(d.table.x), y: mm(d.table.y) },
        pixel: { x: px(d.pixel.x), y: px(d.pixel.y) },
        ring_to_dot_px: px(d.gap),
        ...(h ? { off_the_corner_map_px: px(dotResiduals[k]!) } : {}),
      })),
      matched_points_note: input.dots.length
        ? `Dots painted on the mat's crossings, as Auto found them in the camera picture when it set the calibration's points: each is a table position (mm) and the centre of the orange dot seen there (pixels, to about a tenth of a pixel on a 4K picture). ring_to_dot_px is how far the projected ring still sat from the dot when the point was accepted (under 1 pixel), off_the_corner_map_px how far the dot sits from where the corner map above would put it (the lens and the clicking show up here${worst !== null ? `; the worst is ${px(worst)} px` : ''}). These are the best matches between picture and table in this file.`
        : 'Auto has not set any points with this camera since its corners were last found, so there are no measured dots; run Auto first for a precise list.',
    },
  };
}
