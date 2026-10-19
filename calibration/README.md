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
| `projector-36x24in.svg` | 36 × 24 in | A large cutting mat ruled in inches |
| `projector-24x18in.svg` | 24 × 18 in | A medium mat ruled in inches |
| `print-a4.svg` | A4 | Printing at 100% to check a printer |
| `print-letter.svg` | Letter | Printing at 100% to check a printer |
| `print-letter-in.svg` | Letter | The same with an inch grid |

Open a projector card in Lantern or Pattern Projector the same way as a
Grain-Nest export, calibrate as usual, then measure the squares on the table
with a tape. The layers (Grid cm or Grid in, Rulers in, Keystone, Calibration,
Instructions, Border) can be switched off one at a time, so you can project
just the grid onto fabric to check it is on grain before cutting.

## Remaking them

```sh
node make.mjs
```

No dependencies. The sizes and texts are at the bottom of `make.mjs`; add a
line to `CARDS` for a different size, with `unit: 'in'` for an inch grid.
