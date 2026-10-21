# Lantern

Projector cutting for sewing patterns, with a calibration that bends. One web
page: open a PDF pattern (or an SVG from Grain-Nest), it is drawn at true size
through the calibration, drag it into place and cut. Nothing leaves the
browser.

The reason it exists: Pattern Projector's calibration is four corners, which
is exactly right for a flat table at any tilt and nothing else. A desk that
dips at one end, a floor that is not quite a plane, or a cheap projector lens
that bulges the middle of the picture, all leave the middle of the grid out
while the corners are perfect. Lantern starts with the same four corners and
then lets you add points between them and drag each one onto the mat line it
is labelled with, so the picture bends to follow the surface.

## How to use it

1. **Calibrate**, once per table. Put the size of your mat (or of a rectangle
   you have taped out and measured) in the boxes, go full screen, and drag the
   four corners onto its corners. The grid is every centimetre (or inch) and
   numbered every 10 cm (12 in); the dashed diagonals are straight on a flat
   table.
2. If the inner lines do not land on the mat's lines: a fresh table has no
   inner points, only the four corners. Press **Add points** (a point every
   15 cm or 6 in), or type how far apart you want them in **Points every**.
   Points are counted from the top-left corner in whole steps, so with 6 in
   on a 35 in mat they sit at 6, 12, 18, 24, 30 and then the far edge at 35,
   each on a line of the mat; the last cell is just shorter. Circles appear
   at the crossings, labelled with their distance from the corner; drag each
   one onto that crossing on the mat. Arrow keys nudge the selected point a
   pixel at a time; `Tab` picks the next one along the row and `Shift+Tab` the
   next one down the column (`[` and `]` go back and forth). Every circle has a
   clear centre with nothing drawn over it, so a dot painted on the mat
   crossing shows in the middle; the selected one is bigger, in the chalk
   colour, with long arms pointing in at the dot. **Corners only** forgets
   the inner points.
3. **Project**: open a PDF or SVG, drag it into place, turn it (`R` for 90°,
   `,` and `.` for 1°), flip it (`F` across, `V` down), invert for white lines
   on black (`I`), thicken the lines, pick the size layer, hide the tools
   (`H`) and cut. **Grid** projects the calibration grid over the fabric to
   check the grain or the calibration; **Outline** shows the page edge.

**Project the card** draws a [calibration card](../calibration/) the size of
the table, with the grid in the unit you are using, and opens it as the
pattern: every line should sit on a line of the mat, and the squares measure
true with a tape. **Save card** writes the same card as an SVG, to project
with Pattern Projector or to print.

Each table keeps its own calibration (**New table** for Desk, Floor, …), and
each remembers the window it was made in, so calibrate in full screen and
project in full screen. If the window is a different size, the page says so.

**From a chair.** With a webcam over the table (an iPhone on a mount is a
Mac webcam through Continuity Camera), press **Camera** in Calibrate. A small
window shows the picture; press **Find corners** and click each of the four
corner crosses in it, roughly first and then close up once the window has
zoomed in on the spot, and from then on the window zooms in on whichever
point is selected. Over the picture the pointer is a small open ring, so a
dot on the mat shows inside it as you click. The projected cross in the picture is the thing to line
the dot up with; nothing is drawn over it. So: `Tab` to the next point, arrow keys until the
projected cross sits on the mat line in the picture, next point. The window
can be dragged and resized, the picture turned, mirrored and zoomed 1× to
8×, and a click in it looks somewhere else until the selection changes. The
camera needs the page served over https (the Pages site) or from localhost,
not opened as a saved file. The camera is never measured: it only decides
where to zoom, and your eye does the aligning.

With an iPhone, how much of the table the picture shows is set by the Mac,
not by Lantern: while the camera is open, click the green camera icon in
the menu bar and set the zoom in that panel to 0.5×, the phone's wide lens.
From 1.3 m that takes in a 53 × 35 in table with room to spare; at 1× it
only just does. The Mac remembers the setting for the browser, separately
from other apps, and now and then goes back to 1× on its own, so if the
picture has narrowed, that is where to look. Centre Stage should be off.

With no gridded mat, as on a floor: tape out a rectangle, measure it, put its
size in the boxes, drag the corners onto it, and lay a tape measure along a
grid line. Every point is labelled with its distance from the top-left
corner, so you can drag it onto the right spot on the tape.

## What it reads

- **PDF**: any page of a multi-page file, with the layers (pattern sizes are
  usually layers) switchable. Page size comes from the PDF, so a copyshop A0
  file is A0 on the table. Pages are not stitched together: open the A0 file,
  or a single page at a time.
- **SVG**: a Grain-Nest export or one of the [calibration cards](../calibration/),
  sized from its `width`/`height` in mm, cm or inches, with Inkscape layers
  switchable.

## How it works

`src/calc/homography.ts` is the four-corner map. `src/calc/mesh.ts` is the
mesh: column and row positions chosen to land on the mat's lines (the last
cell takes what is left), the corners' homography plus a nudge per inner
point, blended bilinearly inside each cell, so adding points changes nothing
until one is moved;
`screenToTable` inverts it with Newton's method so dragging the pattern works
in table centimetres on a bent table too. `src/calc/placement.ts` is where
the page sits (centre, turn, flip, scale). `src/render.ts` draws the page
through the mesh with WebGL 2, with the line weight and inversion in the
shader; `src/document.ts` opens PDFs with pdf.js (bundled, worker included)
and SVGs through an image. `src/camera.ts` is the camera window. `src/main.ts`
is the page.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # the maths
npm run typecheck
npm run build      # dist/index.html, one self-contained file, plus manifest, icons, sw.js
npm run smoke      # clicks through the built page in headless Chromium
```

Lantern needs WebGL 2, which every current browser has; Chrome or Safari on
the Mac that drives the projector is the expected home. It is installable
like Thimble and works offline.

## Thanks

[Pattern Projector](https://github.com/Pattern-Projector/pattern-projector)
by Courtney Pattison (MIT) showed what projector cutting in a browser should
feel like; its four-corner calibration is the starting point here. Nothing
from it is copied, so Lantern is not a fork: it is a smaller page in the
same spirit with one idea added.
