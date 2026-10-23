# Ideas list

Running list, in the same spirit as Stash's. Nothing here is promised. Say
"add X to the ideas list" and it goes here; ticked items have shipped.

## Questions I would have asked first

I went ahead rather than interview you, because the other two repositories
answered most of what I needed. These are the things I guessed at, so I would
like to know:

1. **Where do you want things to run?** Thimble is a web page because a
   calculator is most useful on a phone at the cutting table. If you would
   rather everything be a Mac app like the other two, say so and the next
   thing will be Electron.
2. **Which calculations do you actually reach for?** I picked the ones most
   sewists do with a ruler and a scrap of paper. If there is one you do every
   project that is not here, that is the next one to add.
3. **Metric or imperial by default?** Stash keeps fabric in metric and
   measurements in inches, so Thimble starts in cm and remembers the toggle.
4. **Serger / overlocker?** Toldi Lock thread in the stash suggests one, so
   Needle and thread now carries overlocker stitch, length and differential
   feed by fabric. Tensions are left out: tell me the model and they can go in.
5. **Does anything here overlap with what you are planning in Stash?** Stretch
   percentage and yardage conversion could belong in Stash's pattern ↔ fabric
   matching. The maths in `thimble/src/calc` is plain TypeScript with no
   browser code, so it can be copied straight into Stash.

## Thimble

- [ ] **Overlocker tensions** — the settings now give differential feed, stitch
      length and width; tension starting points vary too much by machine to
      put in a table without knowing the model.
- [ ] **Hem allowance for curved hems** — how narrow a hem a curve can take
      before it puckers, by the hem's radius.
- [ ] **Dart intake from a measurement difference** — waist to hip difference
      shared across the darts and side seams.
- [ ] **Shaped waistbands** — the straight band is done; a contoured band needs
      the hip measurement and a curve, which is pattern drafting rather than
      arithmetic.
- [ ] **Named result sets** — Copy gives one calculator's inputs and results as
      text; saving several per project, to reopen later, would be the next step.
- [ ] **Hems in the thread estimate** — the export SVG gives seam lines; hems
      and topstitching are still a guess on top.

## Lantern

- [ ] **Stitching multi-page PDFs** — tiled home-print patterns laid out into
      one sheet, the way Pattern Projector does; Lantern opens one page at a
      time, which is fine for copyshop A0 files.
- [ ] **A point where the trouble is** — the mesh is a grid at one spacing,
      so a dip in one corner means a whole column of points; a point dropped
      anywhere would be lighter.
- [ ] **Measure tool** — click two points on the table and read the distance,
      to check the calibration on the fabric without a tape.
- [ ] **Mark and annotate** — a line snapped onto a grainline or a fold, kept
      with the placement.
- [ ] **Camera calibration, further** — Auto sets the points from the dots;
      next would be finding the corners in the picture too, so there is
      nothing to click, and a check pass that only reports how far out each
      point is.
- [ ] **Shared calibrations** — export a table as a file so a second device
      driving the same projector can use it.

## Other things

- [ ] **Bolt End from Stash itself** — a "Print labels…" item in Stash that
      writes the CSV and opens Bolt End with it, instead of exporting first.
- [ ] **Burn-test card** — a swatch card variant with the fibre test results
      (flame, smell, ash) and the usual fibres' behaviour printed on it.

## Shipped

- [x] **Lantern v0.4.13** — Auto takes the dot's centre from the shape of
      the orange patch, every pixel counting the same and a glint inside it
      filled in, rather than an average weighted by how bright and orange
      each pixel is; so the side the projector lights more strongly no
      longer pulls every point a couple of millimetres the same way.
- [x] **Lantern v0.4.12** — Auto keeps a point only within 1 camera pixel
      of its dot (was 1.5), stops at 0.4 (was 0.5), has eight goes instead
      of six, and never ends on a move it has not looked at; so running a
      point again moves it by nothing you can see.
- [x] **Lantern v0.4.11** — at a corner or edge, Auto also looks at the
      ring at the point itself, fitted with the exact size the stepped-in
      rings gave, and uses that over the straight-line guess when enough
      of it shows, since the guess assumes the mat is flat over the two
      steps; Camera frames says how far the two disagreed.
- [x] **Lantern v0.4.10** — Auto notices a camera frame that still shows
      the ring where it was before the point moved and takes the frame
      again, instead of measuring a gap already corrected and overshooting;
      Camera frames says when the picture lagged. While Auto runs the
      Show tools button and the pointer are off the screen too.
- [x] **Lantern v0.4.9** — at a corner or edge, Auto refuses the point
      when a stepped-in ring is not whole or the two rings are not where
      they should be relative to each other (a tool lying over one), and
      says that the rings are shown a step in from the point; a run waits
      for the camera's exposure to settle on the white screen before the
      first point; Camera frames takes exposure drift out of its darkened
      panel.
- [x] **Lantern v0.4.8** — a corner can be moved on its own, with the
      inner points staying where they are: Shift while dragging, or the
      Corner alone switch for drags and arrow keys; `A` on a corner moves it
      alone too, so a corner put right after a good run does not drag the
      rest with it.
- [x] **Lantern v0.4.7** — for a corner or edge point, whose ring would be
      cut off by the screen, Auto shows two whole rings stepped in from the
      point and works out where the ring at the point would be from them,
      instead of measuring a quarter ring in the dimmest part of the
      picture; the corners no longer get pulled off.
- [x] **Lantern v0.4.6** — Snapshot in the camera window saves the whole
      picture as the camera sees it, to check the projection from the chair
      or to send.
- [x] **Lantern v0.4.5** — at a corner or edge, where only a quarter or
      half of the ring shows, Auto holds the ring's radius at what it must
      be (as drawn, times the camera's scale there, corrected by the rings
      it has seen whole) and fits only the centre, so the far corner
      settles instead of sitting 2–3 px out.
- [x] **Lantern v0.4.4** — Auto fits a circle to the ring it sees, so a
      corner or edge point whose ring is cut off by the screen's edge still
      gets the ring's true centre; the orange test goes by hue, so a
      red-orange dot and orange vinyl count and yellow does not; and a pale
      small dot at the picture's edge passes (score 25, was 40).
- [x] **Lantern v0.4.3** — Auto looks for the ring only around where it
      should be and only on the lit mat, so a laptop or the floor past the
      mat's edge flickering between frames no longer gets the ring refused
      as "scattered".
- [x] **Lantern v0.4.2** — Auto sees a ring that is only a shade darker
      than the mat (the threshold comes from the picture, not a fixed
      contrast), no longer takes a red mat line for the dot (red with no
      green over blue scores nothing, and anything but a small compact patch
      is refused), gives up when the ring and dot stop closing in or the
      point would travel too far, and puts a point it could not set back
      exactly where it was. The whole loop is tested against a pretend
      table and camera.
- [x] **Lantern v0.4.1** — Auto finds a small, blurred dot by how orange
      each pixel is rather than a hard yes or no; waits for a fresh camera
      frame before looking; says in the summary what it saw (pixels changed,
      best orange score); and Camera frames saves a picture of what the
      camera saw at the last points, to send when one is skipped.
- [x] **Lantern v0.4.0** — automatic calibration from the camera: with
      orange dots on the mat crossings, Auto projects a black ring at each
      point and moves it until the ring is centred on the dot, to about half
      a millimetre; a frame with the ring minus one without leaves only the
      ring, so the mat's own lines cancel out. The camera window keeps out
      of the way of the selected point.
- [x] **Lantern v0.3.7** — over the camera picture the pointer is a small
      open ring instead of an arrow, so a dot on the mat shows inside it as
      you click; the close-up corner click is at 8×.
- [x] **Lantern v0.3.6** — help and README say where the camera's field of
      view is set with an iPhone: the Mac's green camera icon, zoom 0.5× for
      the wide lens, remembered per app and sometimes forgotten.
- [x] **Lantern v0.3.5** — camera window: Find corners takes two clicks per
      corner, a rough one that zooms the window in and a close one that
      counts, so the corners can be placed accurately; and no ring is drawn
      at the window's centre, which sat a little off the projected cross and
      read as the thing to align with. The cross in the video is the target.
- [x] **Dot stencil** — `stencil/dot-stencil.scad` and its STL: a printed
      40 mm plate with an 8 mm hole, a V-notch in each edge to line up with
      the mat's lines, sighting grooves and a lifting tab, for painting the
      dots at the crossings instead of sticking them.
- [x] **Dot sheet to cut** — `calibration/cards/dots-8mm-100.svg`: a hundred
      8 mm circles, 12 mm apart, for cutting from orange vinyl on a Cricut.
- [x] **Mat layout cards** — `calibration/cards/mat-53x35in-layout.svg`
      (and 36 × 24 in): lines every 12 in and an 8 mm target for a dot every
      6 in, placed and labelled as Lantern places its points, to project and
      draw along; a dot tile for Letter and A4 to print at 100% for marking
      or checking dots a 6 in cell at a time.
- [x] **Phone pocket** — a printed ceiling pocket for the camera phone: a
      plate with slide channels, a tray with a camera window that slides on,
      the phone dropped in loose. Parametric OpenSCAD plus STLs.
- [x] **Lantern v0.3.4** — the arms of each calibration cross run along the
      grid lines through the point, turned with the table, instead of level
      with the screen.
- [x] **Lantern v0.3.3** — calibration rings that survive the projector: an
      opaque centre blots out the grid lines crossing each point, the rings
      are pink (purple on white), a colour the grid never uses, and thicker.
- [x] **Lantern v0.3.2** — calibration handles redrawn for a mat with painted
      dots: every ring has a clear, lit centre with nothing drawn over it, and
      the selected point is a big chalk-coloured ring with long arms pointing
      in at the dot instead of a filled disc that hid it.
- [x] **Lantern v0.3.1** — Tab and Shift+Tab walk the calibration points along
      the row and down the column; the arms of each cross stop short of the
      centre so a painted dot on the mat sits in a clear hole.
- [x] **Lantern v0.3.0** — a camera window for calibrating from a chair: a
      webcam over the table in a small window that zooms in on the selected
      point once the four corners have been clicked in the picture, so the
      arrow keys do the aligning while the mat is watched on screen.
- [x] **Lantern v0.2.0** — points at a chosen spacing (every 6 in or 15 cm,
      counted from the corner, so each sits on a mat line) instead of a
      count; an Add points button; a calibration card for the current table
      and unit, projected straight away or saved as an SVG; and the inch
      calibration cards (53 × 35, 36 × 24, 24 × 18 in, Letter).
- [x] **Lantern v0.1.0** — projector cutting with a calibration that bends: the
      four-corner homography plus a nudge per added point, blended inside each
      cell, so a dip in the desk or a bulge in the lens is dragged out at the
      point where it is; PDF (any page, layers) and SVG (Grain-Nest exports,
      calibration cards, Inkscape layers) at true size through WebGL; move,
      turn, flip, invert, line weight, grid over the fabric, several tables
      each with its own calibration, installable and offline, a smoke test
      in CI.
- [x] **Bolt End v0.2.0** — Niimbot B21 labels: ten roll sizes and a custom
      size, each row drawn at 203 dpi, printed over Web Bluetooth from Chrome or
      Edge (darkness, copies) or saved as PNGs for the Niimbot app.
- [x] **Thimble v0.5.1** — fixes from a code review: inverted pleat marks now
      meet on one placement line; knife pleats keep their last placement line;
      the yardage piece list follows the unit toggle; a fat quarter is a quarter
      yard in inches; a cut-list name ending in a number keeps it; the bias
      note's fat-quarter figure corrected to about 6 m.
- [x] **Thimble v0.5.0** — Grain-Nest files: Thread reads the sew lines of an
      export SVG; Yardage estimate reads piece sizes and cut codes from a
      pattern SVG; a Cutting list with a box per copy from the cut list text.
      Circle skirt says how much hem allowance there is to ease in. People can
      be copied as text and pasted on another device.
- [x] **Thimble v0.4.0** — People: read Stash's Measurements.csv (or type
      someone in) and fill the body fields of Circle skirt, Elastic, Waistbands,
      Stretch and ease and Cup size and FBA from a name. Reference group:
      Pressing and interfacing by fibre, Seam finishes by fabric, Burn test by
      what you saw. A browser smoke test in the repo, run by CI.
- [x] **Bolt End v0.1.0** — shelf labels, swatch cards and hang tags from a
      Stash CSV export: six Avery layouts plus cards and tags, choose the lines,
      filter by status or a word, start part way down a used sheet, print at
      true size. One Pages site for all the web projects, and a CLAUDE.md.
- [x] **Thimble v0.3.0** — Weigh fabric (length left from the kitchen scales),
      Price compare (metre, yard, fat quarter, any width), Waistbands and cuffs,
      Sleeve cap ease, Cup size and FBA, Yardage estimate from piece sizes. The
      nineteen calculators are grouped (Cutting, Fitting, Buying, Machine) with a
      dropdown on phones.
- [x] **Calibration cards** — projector and print test cards matching Grain-Nest's
      calibration square and colours, with grid, rulers, corner squares and circle.
- [x] **Thimble v0.2.0** — Seam allowances and Thread calculators; overlocker
      settings on every needle card; a Copy button that writes one calculator's
      inputs and results as text for project notes; long lengths typed in metres
      or yards; installable on a phone with an offline copy (manifest, icons,
      service worker); version in the footer.
- [x] **Thimble v0.1.0** — the first eleven calculators, metric and imperial,
      light and dark, phone layout, GitHub Pages workflow.
