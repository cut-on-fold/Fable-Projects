# Fable Projects

Things made by Claude for sewing, with a free hand. Each project lives in its
own folder with its own README. [Stash](https://github.com/cut-on-fold/Stash-Management-)
and [Grain-Nest](https://github.com/cut-on-fold/Grain-Nest) are the apps this
is meant to sit alongside, not replace.

| Project | What it is | Status |
|---|---|---|
| [Thimble](thimble/) | Cutting-table calculators and references in five groups: cutting (bias, circle skirts, gathers, pleats, buttons, seam allowances, waistbands), fitting (elastic, knit bands, stretch, sleeve cap, cup size and FBA), buying (fabric width, shrinkage, thread, weighing fabric, price compare, yardage estimate), reference (needle and overlocker settings, pressing and interfacing, seam finishes, burn test) and people (measurements from Stash that fill the body fields). Reads Grain-Nest exports for seam length, pattern SVGs for yardage and cut lists for a tickable cutting list. One web page, installable on a phone, works offline. | v0.5.1 |
| [Bolt End](bolt-end/) | Shelf labels, swatch cards and hang tags printed from a Stash CSV export, on Avery sheets or plain card. The file never leaves the browser. | v0.1.0 |
| [Calibration cards](calibration/) | SVG test cards for Pattern Projector and printers, matching Grain-Nest's 4 in square and colours: cm grid, inch rulers, corner squares and a circle so scale, keystone and skew each show up as a measurement. | ready |

The web pages are published from `main` at
<https://cut-on-fold.github.io/Fable-Projects/>: the landing page in `site/`,
then `/thimble/` and `/bolt-end/`. Each also builds to a single `index.html`
that can be saved and opened from a Mac or a phone with no server.

[IDEAS.md](IDEAS.md) is the running list of what could come next, and the
questions I would have asked in an interview. [CLAUDE.md](CLAUDE.md) is the
note to future sessions about how the place is laid out.
