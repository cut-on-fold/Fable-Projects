# Thimble

Cutting-table calculators for sewing, in one page that works on a Mac, a phone
or a tablet propped up next to the fabric. Nothing to install and nothing sent
anywhere: your numbers stay in the browser.

**Use it:** open the published page (see *Publishing* below), or download
`index.html` from a release and open it in any browser. It works offline.

## What it works out

| Calculator | What you give it | What you get |
|---|---|---|
| **Bias strips** | A square or offcut and a strip width, or a length of bias you need | Continuous bias the piece yields; the square to cut for a length; the cut strip width for a single- or double-fold binding; binding needed for an edge |
| **Circle skirt** | Waist, ease, how much of a circle, length, allowances, fabric width | Waist radius at the cut edge and the stitching line, hem radius, finished hem length, fabric needed and whether it is one piece or quarter panels |
| **Gathers and ruffles** | Finished length, ratio, depth, hem, fabric width | Cut length and depth, strips across the fabric, fabric to cut; what a strip you already have gathers down to |
| **Buttons** | Placket length and a count, a spacing, or one button that must sit at the bust | Every button's position from the top and the bottom; buttonhole length for flat, domed and ball buttons |
| **Elastic** | Body measurement and the kind of elastic | Cut length with the overlap, finished loop, quarter marks |
| **Knit bands** | Opening and the kind of band | Band cut length and width, quarter marks |
| **Pleats** | Finished width, pleat width and depth, knife, box or inverted | Cut width, pleat count, fabric ratio, and every fold and placement line to chalk |
| **Fabric width** | Length at the pattern's width, your fabric's width | Length to buy, rounded up to 10 cm or ⅛ yd, with a chart of common widths |
| **Shrinkage** | A swatch measured before and after washing, the length the pattern needs | Shrinkage along and across the grain, length to buy, width after washing |
| **Stretch and ease** | A marked fold stretched, the stretch the pattern wants, body measurement, negative ease | Stretch percentage and what that fabric suits, whether it meets the pattern, finished measurements |
| **Needle and thread** | The fabric's name or type | Needle type and size, thread, stitch length and a tip, from sheers to leather |

Lengths take fractions (`1 1/2`, `5/8`, `⅝`) and unit suffixes (`45"`, `2 yd`,
`1.2 m`, `250 mm`) whichever unit is switched on. Inches come out in eighths
(sixteenths under an inch); buying lengths in metres or yards.

## Develop

Needs Node 22.

```sh
cd thimble
npm install
npm test            # the maths, with vitest
npm run typecheck
npm run dev         # live at http://localhost:5173
npm run build       # dist/index.html, one self-contained file
```

Layout: `src/calc/` is the arithmetic, one module per calculator, plain
functions over centimetres and unit-tested in `tests/`. `src/units.ts`
parses and formats lengths. `src/tools.ts` describes each calculator as
fields in and rows out, and `src/main.ts` draws them.

## Publishing

`.github/workflows/thimble-pages.yml` builds the page and publishes it to
GitHub Pages on every push to `main` that touches `thimble/`. The repository
needs Pages switched on once: **Settings → Pages → Source: GitHub Actions**.
The page is then at `https://cut-on-fold.github.io/Fable-Projects/`.

## Where the rules of thumb come from

The formulas are the ones in dressmaking references and pattern instructions:
circle skirt radius from the circumference, 1:3 knife pleats, bias length from
the area of the square less a tenth for joins, elastic cut 5–15% short by type,
knit bands at 80–90% of the opening, buttonhole length as diameter plus
thickness plus 3 mm, and the fabric-width conversion that keeps the area equal
(which is what the chart on the back of a pattern envelope does, to within an
eighth of a yard). Every one of them is a starting point for a test on a scrap,
and the page says so.
