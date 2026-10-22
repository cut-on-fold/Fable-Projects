# Fable Projects

Notes for Claude sessions working in this repository. The first part is the
shared cut-on-fold guidance (from cut-on-fold/Claude-Template,
`CLAUDE-template-draft.md`), kept word for word so it can be refreshed from
there; the second part, **This repository**, is particular to Fable Projects and
wins where the two differ.

# Working in a cut-on-fold repository

Notes for Claude that hold in every repository. A project's own CLAUDE.md
adds its layout and anything particular to it; it doesn't repeat this.

## Who this is for

- The owner sews, 3D-prints and crafts. Not a software engineer, and around intermittently, so use her time carefully. Apple Silicon Mac (M4), Prusa XL with PrusaSlicer, Inkscape, Pattern Projector, an overlocker. Sews for more than one person.
- Plain language, British spelling. Define a technical term in a short clause
  the first time it comes up ("a branch, a trial copy of the code to check
  before merging"), then use it. No jargon the owner would not use at the
  cutting table. Rules of thumb are labelled as starting points.
- Craft, fabric and workflow questions are the owner's to decide: if one comes up and she hasn't said, flag it as open rather than picking a default. Technical choices (libraries, structure, edge cases) are yours to make and explain; bring one to her only when it changes what she'll see, framed as a plain trade-off with a recommendation.
- Do the technical work yourself: git, npm, builds, tests. Ask her only for
  what needs a person in front of the app on the Mac.
- When something does need trying on the Mac, give a short numbered list of the specific things to try, in priority order, never "everything new".

## Delivery

- At the start of a session read README.md, IDEAS.md (if there is one) and
  the newest pull request, and mention any pull request still open before
  doing anything else.
- Branch, commit, push, open a pull request, wait for the checks, merge it
  yourself once they are green, then say in plain words what is now in. Never merge with red checks. Ask before merging only when a change needs craft judgement or alters how the app behaves in a way she hasn't asked for. A bad change is undone with a new pull request that reverts it.
- When you choose the branch name, name it after the change
  (`v0.5.2-nfc-write`, `hose-arm-dowel`). Title the pull request and the
  commit the same way: `v1.9.0: pairs and folds from cut codes`, or
  `Hose arm: 18mm dowel` where there are no versions.
- The pull request body says what changed, why, and what she'll notice, in
  everyday words, with a **Tests** section at the end. Say plainly what CI
  could not check and needs a try on the Mac.
- One pull request per version. Every user-visible change bumps the version
  (`package.json` or `pyproject.toml`), adds a ticked line under Shipped in
  IDEAS.md (or an entry in CHANGELOG.md), and updates the README wherever it shows a version.
- IDEAS.md is the running list. "Add X to the ideas list" puts it there;
  nothing on it is promised; shipped items are ticked with their version.
- Don't defer something she asked for on your own judgement. Do it this round or ask her, and keep anything parked visible in the list.

## Privacy and names

- Never commit paid pattern PDFs, Stash exports, real pattern files, photos
  of people or API keys. `.gitignore` carries `*.pdf` with a named exception for each made-up fixture. Real files for testing live in a folder outside the repository and are reached through an environment variable
  (`STASH_GRADING_FIXTURES=/path npx vitest run tests/grading`).
- Don't name people in code, comments, tests, commit messages or docs of anything that is or may become public. Say "testing round 3" or the version instead. Don't name pattern companies beyond the ones already there.
- A private Workshop repository can hold notes, briefs and real files; its
  public twin gets only the code, guide and examples, after a check for
  personal references (see Grain-Nest-Workshop/docs/make-public-copy.sh).

## Code and tests

- The maths and the logic live in their own module with no UI or framework
  imports (`src/calc`, `src/core`, `ownbrew.calc`), unit-tested before they
  get a UI, so they can be copied whole into another project.
- Tests drive the real formats against in-process fakes (a fake projector
  that speaks the wire protocol, a pretend NFC reader, a local pretend shop), not mocks of our own code.
- Every app has a smoke test that builds it and clicks through it headlessly
  (`npm run smoke`, under `xvfb-run -a` on Linux), saving screenshots only
  for failures. `npm test`, `npm run typecheck` and `npm run build` pass
  before a pull request; CI runs them on Linux.
- Pin dependencies to exact versions in `package.json`, and keep an `.npmrc` with `before=<date>` about two weeks back so installs only get packages that have been out a fortnight. Node 22+, `npm ci` in CI. Lock files are committed.
- Units: store lengths precisely in one base unit (cm or mm) and convert on
  display. Fabric in metric, body measurements in inches; inches shown as
  eighths (sixteenths under an inch); buying lengths round up to 10 cm or
  ⅛ yd. Printing and brewing are metric throughout.
- 2-space indent, LF, UTF-8, final newline (`.editorconfig`); `* text=auto`
  with LF forced for `*.sh`, `*.command` and `.husky/*` (`.gitattributes`).
- Say honestly what a tool does and does not do, in the README, and label
  predictions as predictions.

## Stacks already in use

Pick the one that matches rather than starting a new one.

- **Mac apps**: Electron + TypeScript (Vite + React for Stash), Apple Silicon
  only, unsigned and ad-hoc signed. Shipped as
  `<app>-v<version>-macos-arm64.dmg` attached to a GitHub release, with the README explaining right-click → Open the first time. Data in
  `~/Library/Application Support/<App>/`, backups to iCloud Drive.
- **Web tools**: Vite + TypeScript, no framework, one `dist/index.html` that
  works offline and installs on a phone; nothing leaves the browser.
  Published from `main` with GitHub Pages.
- **Python**: standard library only where possible, `pyproject.toml`, `src/`
  layout, a console script, tests with unittest or pytest, Python 3.11+.
- **3D prints**: a parametric `.scad` with the sizes at the top in
  `/* [Group] */` blocks and a `part` variable choosing what to render; STLs
  exported next to it; a `preview.png`; a README with a table of files and
  what each is for. State the print orientation and design so nothing needs
  supports. PETG, 0.2 mm layers, 4 walls unless the README says otherwise;
  a small fit-test piece first for anything that has to grip or clip.
  Millimetres.
- **Sewing patterns**: a Python script that writes a 1:1 SVG in mm for
  Inkscape, committed with its output; a 100 mm or 4 in test square; seam
  allowance included and stated; grainlines; cut codes in piece names
  (`C2M` = cut 2 main, `C1MOF` = cut 1 main on fold).
- **If an app calls Claude**: the key goes in the keychain through
  `safeStorage` and never reaches the renderer; the model is chosen in
  settings with a running cost shown; the model gets text and images only,
  no tools, and never creates list entries silently (suggestions to accept).

## How the projects fit together

Stash (the stash database), Grain-Nest (nesting) and Fable-Projects (Thimble,
Bolt End, Lantern) pass files between them: Stash CSV exports, Grain-Nest
SVG exports (a layer per sheet, a named group per piece, `grain-N` paths,
cut codes, a 4 in calibration square), graded SVGs from Test-Pattern-Grading.
Keep to those formats. Link to the other repository rather than describing
it, and copy a pure module whole rather than importing across repositories.

## GitHub Actions

Actions storage is shared across all my repositories and the free allowance is
small (0.5 GB-months), so any workflow you write must follow these rules:

- Upload artifacts (screenshots, test reports, logs) only when a step fails,
  with `if: failure()` and `retention-days: 5` or less. A green run stores
  nothing.
- Never keep a build (app, dmg, zip) as an artifact for more than two days.
  Anything meant to be downloaded goes on a GitHub release instead, which
  does not count against storage.
- Run tests once per commit: `pull_request` for branches, `push` only for
  `main`. Not `push` on every branch.
- Mac runners cost ten minutes for every real minute, so use `macos-*` only
  for builds that need a Mac, never for routine tests.
- Include the `Tidy artifacts` workflow from
  cut-on-fold/Fable-Projects/.github/workflows/tidy.yml, so old artifacts can
  be cleared by hand from the Actions tab.

And the habits the existing workflows already follow:

- A comment at the top of each workflow saying when it runs and why.
- `permissions:` as narrow as the job needs (`contents: read` for tests),
  `timeout-minutes` on every job, `paths:` filters so docs-only changes
  don't run tests, `concurrency` with `cancel-in-progress` for Pages.
- Current action majors: `actions/checkout@v5`, `actions/setup-node@v5`,
  `actions/upload-artifact@v5`, `actions/github-script@v7`.
- Electron tests: `ubuntu-22.04`, Node 20, `npx playwright install-deps
  chromium` (the system libraries, not the browser), `xvfb-run npm test`.
- Mac builds: a reusable `build.yml` on `workflow_dispatch` and
  `workflow_call`, and a release workflow that calls it on a published
  release or a version tag and attaches the `.dmg` from a Linux job with
  `gh release upload --clobber`. Create the release only after the build
  succeeds, so a failed build never leaves an empty release.

# This repository

## What it is

Things made for sewing, with a free hand, to sit alongside Stash and
Grain-Nest. Each project lives in its own folder with its own README;
`README.md` has the project table and `IDEAS.md` the running list.

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
  webcam window, `src/calc/vision.ts` finds the ring and dot in its picture,
  `src/autocal.ts` moves the points from that, `src/main.ts` is the page. `calibration/card.mjs` is shared.
  `scripts/smoke.mjs` clicks through the built page in headless Chromium.
- `calibration/` — `card.mjs` draws a calibration card; `make.mjs` writes the
  SVG test cards in `cards/`; CI checks the committed cards match the script.
- `stencil/` — `dot-stencil.scad`, a printed stencil for painting the orange
  dots at the mat's crossings, with its STL and `preview.png`.
- `mount/` — `phone-pocket.scad`, a printed ceiling pocket for the phone
  Lantern uses as a camera, with STLs exported from it (OpenSCAD 2021.01).
- `site/` — the landing page; the Pages workflow copies each project's `dist`
  under it (`/thimble/`, `/bolt-end/`, `/lantern/`).

## Checks

In each web project: `npm test`, `npm run typecheck`, `npm run build`, and
for Thimble and Lantern `npm run smoke` (needs Chromium; CI installs it).
`node calibration/make.mjs` must leave `calibration/cards/` unchanged.
`.github/workflows/tests.yml` runs all of that; `pages.yml` publishes from
`main`; `tidy.yml` clears artifacts by hand.

## Particular to this repository

- Lengths are stored in cm; inches are shown as eighths (sixteenths under an
  inch); buying lengths round up to 10 cm or ⅛ yd.
- Every calculator's maths lives in `src/calc` with a test before it gets a
  UI.
- Version bumps: `package.json` in the project, a line under Shipped in
  `IDEAS.md`, and the project table in `README.md`. Projects version
  separately (Thimble, Bolt End, Lantern).
- Pattern companies named in the docs stay as they are (Cashmerette, Mood,
  IndiePattern); don't add more. Never commit anyone's pattern PDFs, stash
  exports or measurements; test people are invented, with round numbers.
- Colours and type follow Thimble's tokens (tailor's chalk blue on linen,
  chalk on denim in the dark; Bricolage Grotesque for headings, Atkinson
  Hyperlegible for everything else).
- The calibration cards and the phone pocket are files, not pages, and are
  committed with their generator.

## Where this repository differs from the shared guidance, for now

- No `.editorconfig`, `.gitattributes` or `.npmrc` yet; dependencies are
  pinned by hand in each `package.json`.
- The smoke tests save screenshots on every run locally (`smoke-shots/`,
  ignored by git); CI uploads them only on failure.
- Sessions started from the Claude app work on the branch they are given
  rather than one named after the change.
