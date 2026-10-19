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

## Other things

- [ ] **Bolt End from Stash itself** — a "Print labels…" item in Stash that
      writes the CSV and opens Bolt End with it, instead of exporting first.
- [ ] **Burn-test card** — a swatch card variant with the fibre test results
      (flame, smell, ash) and the usual fibres' behaviour printed on it.

## Shipped

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
