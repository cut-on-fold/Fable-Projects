# Calibration cards

Test pages for projector cutting and for printing patterns, drawn to match a
Grain-Nest export: a **4 in (101.6 mm) calibration square** in aubergine with
2 mm lines, and a **cyan border** that stays visible when Lantern or Pattern
Projector inverts the colours. Around that, a 1 cm grid numbered every 5 cm,
inch rulers along the top and left, a 5 cm square in each corner,
corner-to-corner diagonals and (on the projector cards) a 30 cm circle.

The **inch cards** are the same idea for a mat ruled in inches: the grid is
every inch, heavier every 6 and numbered every 6, with a 2 in square in each
corner, an 8 in dashed square round the 4 in one and a 12 in circle. Project
the 36 × 24 in card on a 36 × 24 in mat and every grid line should sit on a
line of the mat.

The point is that each kind of error turns into something you can measure:

| What you see | What it is |
|---|---|
| Everything the same size but wrong | Scale: the projector app's calibration, or the printer's fit-to-page |
| Centre square right, corner squares differ | Keystone |
| One side of the card longer than the other | Skew |
| The circle is an ellipse | Keystone or skew, or both |

## The cards

In [cards/](cards/), ready to use:

| File | Size | For |
|---|---|---|
| `projector-90x60cm.svg` | 90 × 60 cm | The whole throw of a ceiling projector |
| `projector-60x40cm.svg` | 60 × 40 cm | A smaller throw, or the middle of the table |
| `projector-53x35in.svg` | 53 × 35 in | The whole throw over a cutting table ruled in inches |
| `projector-36x24in.svg` | 36 × 24 in | A large cutting mat ruled in inches |
| `projector-24x18in.svg` | 24 × 18 in | A medium mat ruled in inches |
| `print-a4.svg` | A4 | Printing at 100% to check a printer |
| `print-letter.svg` | Letter | Printing at 100% to check a printer |
| `print-letter-in.svg` | Letter | The same with an inch grid |

And for drawing a mat for Lantern's automatic calibration:

| File | Size | For |
|---|---|---|
| `mat-53x35in-layout.svg` | 53 × 35 in | Lines every 12 in and a dot target every 6 in, to project and draw along |
| `mat-36x24in-layout.svg` | 36 × 24 in | The same for a large mat |
| `dot-tile-letter.svg` | Letter | A 6 in cell of dot targets to print at 100%, for marking or checking dots |
| `dot-tile-a4.svg` | A4 | The same on A4 |

Open a projector card in Lantern or Pattern Projector the same way as a
Grain-Nest export, calibrate as usual, then measure the squares on the table
with a tape. The layers (Grid cm or Grid in, Rulers in, Keystone, Calibration,
Instructions, Border) can be switched off one at a time, so you can project
just the grid onto fabric to check it is on grain before cutting.

## Drawing a mat

A mat 53 in wide cannot be printed in one piece at home, and twenty pages
taped together drift at every join, so the accurate way to lay one out is
to project the layout and check it with a tape:

1. In Lantern, calibrate on the four corners of the mat (or of the
   rectangle you have measured and marked), with no inner points.
2. Open `mat-53x35in-layout.svg` as the pattern. It is the size of the
   table, so it sits corner to corner. Draw along the lines with a long
   rule, and stick a dot in the middle of each target: the targets are
   8 mm, every 6 in from the top-left corner and then the far edge, which
   is exactly where Lantern puts its calibration points, and each is
   labelled the way Lantern labels the point.
3. Check with a tape, to the middle of the lines: 12 in between lines, the
   full width and height, and corner to corner (the numbers are on the
   card). Any dot is 6 in from its neighbours.

A four-corner calibration is true on a flat table, which is what a mat is
drawn on; the inner points exist for tables that are not flat. The dot
tile is for the last mm: print it at 100% (check the 4 in square), lay it
with two targets on two dots and mark the next two through the centres, or
lay it over four dots to check them.

Lines in **green** or **blue** (thin, about 1 mm) and dots in **orange** are
what Auto expects: it takes orange, red-orange and orange vinyl for a dot,
and never green, blue, grey, pink or red. Yellow and brown are best kept
off the mat.

## Any other size

Lantern draws a calibration card for whatever table it has: set the size
and unit in Calibrate, then **Project the card** or **Save card**. That is
the same drawing as these files, from `card.mjs`. For a mat layout of
another size, add a line to `LAYOUTS` in `make.mjs` (`lineEvery` and
`dotEvery` are in mm, `dot` is the dot's diameter) and run it.

## Remaking them

```sh
node make.mjs
```

No dependencies. The sizes and texts are at the bottom of `make.mjs`; add a
line to `CARDS` for a different size, with `unit: 'in'` for an inch grid.
