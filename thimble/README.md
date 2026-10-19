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
| **Seam allowances** | The pattern's allowance and yours; a piece measured flat | What to trim or add to every edge; the finished garment measurement and its ease |
| **Thread** | Total seam length (typed, or read from a Grain-Nest export SVG), stitch type, spool size | Thread used, split by needle and looper, and how many spools |
| **Cutting list** | A Grain-Nest cut list, or any list with ×2 after a name | A tickable list, one box per copy, with progress; stays ticked on the device |
| **Waistbands and cuffs** | Waist or wrist, ease, underlap, finished width | Cut length and width, interfacing, where the side seams and centre back fall along the band |
| **Sleeve cap** | Cap and armscye seam lines, fabric | Cap ease, whether it suits the fabric, how much to take out or add |
| **Cup size and FBA** | High bust, full bust, the cup the pattern drafts for | Sewing cup, the size to cut by full bust, FBA or SBA per side |
| **Weigh fabric** | gsm or oz/yd² (or a weighed sample), width, what the piece weighs | How long the piece is; weight class; what a metre weighs |
| **Price compare** | Two prices by metre, yard or fat quarter, at two widths | Price per square metre or yard, which is cheaper, what the project costs on each |
| **Yardage estimate** | Piece sizes and counts (typed, or read from a pattern SVG with Grain-Nest cut codes), fabric width, waste | Fabric to buy for a pattern with no envelope figure |
| **Needle and thread** | The fabric's name or type | Needle type and size, thread, stitch length, overlocker settings and a tip, from sheers to leather |
| **Pressing and interfacing** | A fibre or fabric | Iron setting, steam, press cloth, the interfacing to use and a tip |
| **Seam finishes** | A fabric | The best finish, the alternatives, the hem |
| **Burn test** | What a burning snippet did and smelt of | The fibre, with what each fibre does for comparison |
| **People** | Stash's Measurements.csv, or a name and measurements typed in | A list of the people you sew for; every calculator with a body measurement gets a "fill from" choice |

The calculators are grouped as Cutting, Fitting, Buying, Reference and
People: a list down the side on a desk-sized screen, a dropdown on a phone.

Lengths take fractions (`1 1/2`, `5/8`, `⅝`) and unit suffixes (`45"`, `2 yd`,
`1.2 m`, `250 mm`) whichever unit is switched on. Long lengths (seams, spools,
fabric to buy) are typed in metres or yards. Inches come out in eighths
(sixteenths under an inch); buying lengths in metres or yards.

**Copy** on the results card puts that calculator's inputs and results on the
clipboard as plain text, for a project's notes in Stash.

**Grain-Nest files.** Thread reads an export SVG and adds up its sew lines;
Yardage estimate reads a pattern SVG whose pieces are named Grain-Nest's way
(`7 Skirt Back C2M`, `1 Front C1MOF`) and lists them opened out and counted
for the fabric chosen; Cutting list takes the cut list text. Files are read in
the browser and not kept.

**People.** Measurements from Stash's Measurements.csv, or typed in, fill the
body fields of the calculators that have them. Copy people as text on one
device and paste them on another to move them across.

**On a phone:** open the published page in Safari or Chrome and add it to the
home screen. It installs as an app and opens with no connection; it updates
itself the next time it is opened online.

## Develop

Needs Node 22.

```sh
cd thimble
npm install
npm test            # the maths, with vitest
npm run typecheck
npm run dev         # live at http://localhost:5173
npm run build       # dist/index.html, one self-contained file
npm run smoke       # after a build: clicks through every calculator in a headless browser
                    # (once: npx playwright install chromium)
```

Layout: `src/calc/` is the arithmetic, one module per calculator, plain
functions over centimetres and unit-tested in `tests/`. `src/units.ts`
parses and formats lengths. `src/framework.ts` is the shape of a calculator
(fields in, rows out); `src/tools.ts` and `src/tools-more.ts` describe each
one, and `src/main.ts` draws them. `public/` holds the
manifest and icons; `sw.template.js` becomes `dist/sw.js` at build time with
the version written in, so each release replaces the offline copy.

## Publishing

`.github/workflows/pages.yml` builds the page and publishes it to GitHub
Pages on every push to `main` that touches `thimble/`. It lives at
<https://cut-on-fold.github.io/Fable-Projects/thimble/>.

## Where the rules of thumb come from

The formulas are the ones in dressmaking references and pattern instructions:
circle skirt radius from the circumference, 1:3 knife pleats, bias length from
the area of the square less a tenth for joins, elastic cut 5–15% short by type,
knit bands at 80–90% of the opening, buttonhole length as diameter plus
thickness plus 3 mm, and the fabric-width conversion that keeps the area equal
(which is what the chart on the back of a pattern envelope does, to within an
eighth of a yard). Every one of them is a starting point for a test on a scrap,
and the page says so.
