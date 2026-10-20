# Fable Projects

Things made by Claude for sewing, with a free hand. Each project lives in its
own folder with its own README. [Stash](https://github.com/cut-on-fold/Stash-Management-)
and [Grain-Nest](https://github.com/cut-on-fold/Grain-Nest) are the apps this
is meant to sit alongside, not replace.

| Project | What it is | Status |
|---|---|---|
| [Thimble](thimble/) | Cutting-table calculators and references in five groups: cutting (bias, circle skirts, gathers, pleats, buttons, seam allowances, waistbands), fitting (elastic, knit bands, stretch, sleeve cap, cup size and FBA), buying (fabric width, shrinkage, thread, weighing fabric, price compare, yardage estimate), reference (needle and overlocker settings, pressing and interfacing, seam finishes, burn test) and people (measurements from Stash that fill the body fields). Reads Grain-Nest exports for seam length, pattern SVGs for yardage and cut lists for a tickable cutting list. One web page, installable on a phone, works offline. | v0.5.1 |
| [Bolt End](bolt-end/) | Shelf labels, swatch cards and hang tags printed from a Stash CSV export, on Avery sheets or plain card, or on a Niimbot B21 thermal printer over Bluetooth. The file never leaves the browser. | v0.2.0 |
| [Lantern](lantern/) | Projector cutting with a calibration that bends. Four corners fix the picture like Pattern Projector; add points every 6 in or 15 cm and drag the ones between onto the mat's lines, and a desk with a dip, a floor that is not a plane or a lens with a bulge still projects true. Opens PDF patterns (any page, size layers switchable) and Grain-Nest or calibration-card SVGs at true size; move, turn, flip, invert, thicken lines, project the grid over the fabric. Draws a calibration card for any table size to project or save. A webcam window that zooms in on the selected point, for calibrating sitting down. One table per calibration, kept in the browser. | v0.3.1 |
| [Calibration cards](calibration/) | SVG test cards for Lantern, Pattern Projector and printers, matching Grain-Nest's 4 in square and colours: a cm or inch grid, inch rulers, corner squares and a circle so scale, keystone and skew each show up as a measurement. Sizes for 90 × 60 cm and 60 × 40 cm throws, 53 × 35 in, 36 × 24 in and 24 × 18 in mats, A4 and Letter. | ready |

The web pages are published from `main` at
<https://cut-on-fold.github.io/Fable-Projects/>: the landing page in `site/`,
then `/thimble/`, `/bolt-end/` and `/lantern/`. Each also builds to a single `index.html`
that can be saved and opened from a Mac or a phone with no server.

[IDEAS.md](IDEAS.md) is the running list of what could come next, and the
questions I would have asked in an interview. [CLAUDE.md](CLAUDE.md) is the
note to future sessions about how the place is laid out.
