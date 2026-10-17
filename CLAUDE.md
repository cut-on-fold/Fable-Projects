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
- `calibration/` — `make.mjs` writes the SVG test cards in `cards/`; CI checks
  the committed cards match the script.
- `site/` — the landing page; the Pages workflow copies each project's `dist`
  under it (`/thimble/`, `/bolt-end/`).
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
