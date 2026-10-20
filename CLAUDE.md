# Fable Projects

Things made for sewing, with a free hand, to sit alongside
[Stash](https://github.com/cut-on-fold/Stash-Management-) and
[Grain-Nest](https://github.com/cut-on-fold/Grain-Nest) (read those for how
the owner already works: Mac, Cashmerette / Mood / IndiePattern PDF patterns,
projector cutting with Pattern Projector, an overlocker, sewing for more than
one person, metric for fabric and inches for body measurements).

## Layout

- `thimble/` — cutting-table calculators. Vite + TypeScript, no framework.
  `src/calc/*` is pure maths over centimetres with vitest tests; `src/units.ts`
  parses and formats lengths; `src/framework.ts` is the field-in/rows-out
  shape of a calculator; `src/tools*.ts` are the calculators; `src/main.ts`
  draws them. Builds to one `dist/index.html` plus manifest, icons and a
  versioned service worker.
- `bolt-end/` — printable labels from a Stash CSV export. Same stack.
- `lantern/` — projector cutting with a bendable calibration. Same stack plus
  pdf.js (legacy build, worker bundled) and WebGL 2. `src/calc/homography.ts`
  is the four-corner map, `src/calc/mesh.ts` the mesh of nudges on top of it,
  `src/calc/placement.ts` where the page sits; `src/render.ts` draws through
  the mesh, `src/document.ts` opens PDFs and SVGs, `src/camera.ts` is the
  webcam window, `src/main.ts` is the page. `calibration/card.mjs` is shared.
  `scripts/smoke.mjs` clicks through the built page in headless Chromium.
- `calibration/` — `make.mjs` writes the SVG test cards in `cards/`; CI checks
  the committed cards match the script.
- `mount/` — `phone-pocket.scad`, a printed ceiling pocket for the phone
  Lantern uses as a camera, with STLs exported from it (OpenSCAD 2021.01).
- `site/` — the landing page; the Pages workflow copies each project's `dist`
  under it (`/thimble/`, `/bolt-end/`, `/lantern/`).
- `IDEAS.md` — the running list; tick things off under Shipped with the
  version. `README.md` has the project table.

## Conventions

- Plain language in the UI and the docs, British spelling, no jargon the
  owner would not use at the cutting table. Rules of thumb are labelled as
  starting points.
- Lengths are stored in cm; inches are shown as eighths (sixteenths under an
  inch); buying lengths round up to 10 cm or ⅛ yd.
- Every calculator's maths lives in `src/calc` with a test before it gets a
  UI. `npm test`, `npm run typecheck` and `npm run build` must pass in each
  project; CI runs them.
- Version bumps: `package.json` in the project, a line under Shipped in
  `IDEAS.md`, and the project table in `README.md`.
- Don't name pattern companies in the code or docs beyond the ones already
  there; never commit anyone's pattern PDFs or stash exports.
- Colours and type follow Thimble's tokens (tailor's chalk blue on linen,
  chalk on denim in the dark; Bricolage Grotesque for headings, Atkinson
  Hyperlegible for everything else).
