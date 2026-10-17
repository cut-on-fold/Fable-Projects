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
4. **Serger / overlocker?** Toldi Lock thread in the stash suggests one. A
   differential-feed and tension cheat sheet by fabric would be a natural
   addition to Needle and thread.
5. **Does anything here overlap with what you are planning in Stash?** Stretch
   percentage and yardage conversion could belong in Stash's pattern ↔ fabric
   matching. The maths in `thimble/src/calc` is plain TypeScript with no
   browser code, so it can be copied straight into Stash.

## Thimble

- [ ] **Overlocker settings** — differential feed, stitch length and width,
      and tension starting points by fabric, next to the needle table.
- [ ] **Seam allowance converter** — the pattern has ⅝ in and you sew at 1 cm:
      what to trim and where to put the guide tape.
- [ ] **Hem allowance for curved hems** — how narrow a hem a curve can take
      before it puckers, by the hem's radius.
- [ ] **Dart intake from a measurement difference** — waist to hip difference
      shared across the darts and side seams.
- [ ] **Pattern piece yardage** — rough yardage for a list of piece sizes and
      cut counts, for when there is no envelope figure. (Grain-Nest does this
      properly; this would be the five-second version.)
- [ ] **Thread estimate** — metres of thread a project uses by seam length and
      stitch type, so a spool is not short halfway through.
- [ ] **Save a page of results** — named sets of inputs per project, exported as
      text to paste into Stash's project notes.
- [ ] **Imperial fabric widths with metric lengths** — some shops sell 60 in
      wide fabric by the metre; let a width field take a suffix without
      switching the whole page.
- [ ] **Installable** — a web-app manifest and a tiny service worker so the
      page can sit on a phone's home screen and open with no connection.

## Other things

- [ ] **Projector calibration card** — a printable or projected test page for
      Pattern Projector with a ruled grid and a calibration square matching the
      one Grain-Nest exports, to check keystone and scale before cutting.
- [ ] **Fabric label printer** — labels for fabric bolts and folded stash
      (fibre, width, length, pre-washed, date) printed from Stash's export, so
      the shelves match the database.
- [ ] **Swatch book page** — a printable page per fabric with a swatch window,
      its Stash fields and a burn-test result.

## Shipped

- [x] **Thimble v0.1.0** — the first eleven calculators, metric and imperial,
      light and dark, phone layout, GitHub Pages workflow.
