import { describe, expect, it } from 'vitest';
import { applyHomography, type Mat3 } from '../src/calc/homography';
import { gridLinesMm, referenceJson, tableToCamera, type ReferenceInput } from '../src/calc/reference';

const CM_PER_IN = 2.54;

function input(over: Partial<ReferenceInput> = {}): ReferenceInput {
  return {
    version: '0.4.19',
    taken: '2026-10-31T21:04:10.000Z',
    table: { name: 'Table', width: 90, height: 60 },
    unit: 'cm',
    stepCm: 1,
    heavyCm: 10,
    camera: { label: 'Logitech BRIO', width: 3840, height: 2160, gridSettings: { width: 3840, frameRate: 30 }, plainSettings: { width: 3840, frameRate: 30 } },
    corners: [
      { x: 400, y: 300 },
      { x: 3400, y: 320 },
      { x: 3380, y: 1900 },
      { x: 420, y: 1880 },
    ],
    dots: [{ table: { x: 15, y: 15 }, pixel: { x: 902.4, y: 571.1 }, gap: 0.3 }],
    ...over,
  };
}

describe('gridLinesMm', () => {
  it('runs every square from the corner to the far edge', () => {
    expect(gridLinesMm(5, 1)).toEqual([0, 10, 20, 30, 40, 50]);
  });
  it('ends on the edge even when the last square is short', () => {
    expect(gridLinesMm(5.25, 1)).toEqual([0, 10, 20, 30, 40, 50, 52.5]);
  });
  it('works in inches, to a thousandth of a millimetre', () => {
    expect(gridLinesMm(3 * CM_PER_IN, CM_PER_IN)).toEqual([0, 25.4, 50.8, 76.2]);
  });
});

describe('referenceJson', () => {
  it('describes a centimetre grid on a 90 × 60 cm table', () => {
    const j = referenceJson(input()) as any;
    expect(j.table).toMatchObject({ width_mm: 900, height_mm: 600 });
    expect(j.grid).toMatchObject({ square_mm: 10, squares_across: 90, squares_down: 60, partial_square_across_mm: 0, partial_square_down_mm: 0, heavy_line_every_mm: 100 });
    expect(j.grid.line_x_mm).toHaveLength(91);
    expect(j.grid.line_y_mm).toHaveLength(61);
    expect(j.grid.line_x_mm[90]).toBe(900);
    expect(j.about).toMatch(/3840 × 2160/);
    expect(j.camera.settings_identical).toBe(true);
  });

  it('describes an inch grid and a short last square', () => {
    const j = referenceJson(input({ unit: 'in', stepCm: CM_PER_IN, heavyCm: 12 * CM_PER_IN, table: { name: 'Mat', width: 53.5 * CM_PER_IN, height: 35 * CM_PER_IN } })) as any;
    expect(j.grid.square_mm).toBe(25.4);
    expect(j.grid.squares_across).toBe(53);
    expect(j.grid.partial_square_across_mm).toBe(12.7);
    expect(j.grid.squares_down).toBe(35);
    expect(j.grid.line_x_mm).toHaveLength(55);
    expect(j.grid.line_x_mm[54]).toBe(1358.9);
    expect(j.grid.heavy_line_every_mm).toBe(304.8);
    expect(j.grid.drawn_as).toMatch(/inch/);
  });

  it('gives the corner map in millimetres both ways, with the clicked corners', () => {
    const j = referenceJson(input()) as any;
    const h = j.camera_to_table.table_mm_to_pixel.flat() as Mat3;
    const inv = j.camera_to_table.pixel_to_table_mm.flat() as Mat3;
    const tr = applyHomography(h, { x: 900, y: 0 });
    expect(tr.x).toBeCloseTo(3400, 6);
    expect(tr.y).toBeCloseTo(320, 6);
    const back = applyHomography(inv, { x: 3380, y: 1900 });
    expect(back.x).toBeCloseTo(900, 6);
    expect(back.y).toBeCloseTo(600, 6);
    expect(j.camera_to_table.corners[3]).toEqual({ corner: 'bottom-left', table_mm: { x: 0, y: 600 }, pixel: { x: 420, y: 1880 } });
    expect(j.camera_to_table.lens_correction).toBeNull();
  });

  it('lists the dots Auto measured in millimetres, with how far each sits from the corner map', () => {
    const j = referenceJson(input()) as any;
    expect(j.camera_to_table.matched_points).toHaveLength(1);
    const m = j.camera_to_table.matched_points[0];
    expect(m.table_mm).toEqual({ x: 150, y: 150 });
    expect(m.pixel).toEqual({ x: 902.4, y: 571.1 });
    expect(m.ring_to_dot_px).toBe(0.3);
    const h = tableToCamera(90, 60, input().corners)!;
    const expected = applyHomography(h, { x: 150, y: 150 });
    expect(m.off_the_corner_map_px).toBeCloseTo(Math.hypot(expected.x - 902.4, expected.y - 571.1), 2);
    expect(j.camera_to_table.matched_points_note).toMatch(/worst is/);
  });

  it('says so when there are no corners and no dots', () => {
    const j = referenceJson(input({ corners: null, dots: [], camera: { ...input().camera, plainSettings: { width: 1920 } } })) as any;
    expect(j.camera_to_table.corners).toBeNull();
    expect(j.camera_to_table.table_mm_to_pixel).toBeNull();
    expect(j.camera_to_table.matched_points).toEqual([]);
    expect(j.camera_to_table.matched_points_note).toMatch(/run Auto first/);
    expect(j.camera.settings_identical).toBe(false);
  });
});
