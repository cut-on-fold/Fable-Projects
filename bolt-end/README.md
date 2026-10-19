# Bolt End

Printable shelf labels, swatch cards and hang tags from a Stash export, so the
shelves say the same thing as the database. One web page; the CSV never
leaves the browser.

## How to use it

1. In Stash: **Backups & export → Export everything**. That writes one CSV per
   category.
2. Open Bolt End and choose `Fabric.csv` (or drop it on the page). Patterns and
   Notions work too: any Stash CSV, or any CSV with a header row.
3. Pick the labels, tick the lines you want, filter by status or a word
   (`linen`, `Shelf B`), and set **Start at label** if the first sheet is part
   used.
4. **Print…** at 100% with margins set to none. Print one sheet on plain paper
   first and hold it against the labels.

The name is the title line; the ticked columns print underneath as
`Width: 150 cm`, exactly as Stash wrote them. Lines that are empty for a row
are left out.

## Layouts

| Layout | Sheet | Per sheet |
|---|---|---|
| Avery L7160 | A4 | 21 labels, 63.5 × 38.1 mm |
| Avery L7163 | A4 | 14 labels, 99.1 × 38.1 mm |
| Avery L7165 | A4 | 8 labels, 99.1 × 67.7 mm |
| Avery L7173 | A4 | 10 labels, 99.1 × 57 mm |
| Avery 5160 | Letter | 30 labels, 2⅝ × 1 in |
| Avery 5163 | Letter | 10 labels, 4 × 2 in |
| Swatch cards | A4 or Letter | 6 cards with a 42 mm square for a stapled swatch, outlined to cut |
| Hang tags | A4 | 12 tags 60 × 42 mm, outlined to cut, for folded lengths and remnants |

Another sheet is a line in `src/templates.ts`: page, rows and columns, label
size, margins and gaps in millimetres.

## Niimbot B21

The same rows print on a Niimbot B21 thermal label printer. Pick a Niimbot
size in the Labels list (50 × 30 mm and the other common rolls, or your own
size) and each row becomes one label, drawn in black and white at the
printer's 203 dots per inch: the preview is exactly what prints.

- **Print on the Niimbot…** sends the labels straight to the printer over
  Bluetooth. This works in Chrome and Edge on a Mac, Windows or Android; Safari
  and Firefox have no Web Bluetooth. Switch the printer on, press the button,
  pick the printer from the browser's list. Close the Niimbot app first: while
  it is open it keeps the printer to itself. Darkness and copies are in the
  settings.
- **Download PNGs** saves one image per label, which the Niimbot app prints
  as a picture (New label → picture) at the label's size. This is the way on an
  iPhone or iPad.

The B21 prints 48 mm across its head, so a 50 mm label keeps 1 mm plain at
each edge. If a line does not fit, the status line says how many were left
off: use a smaller text size or fewer lines. Bluetooth printing uses
[NiimBlueLib](https://github.com/MultiMote/niimbluelib) (MIT), the open
implementation of the Niimbot protocol; it was written without a printer to
hand, so the first print is a test print.

## Develop

```sh
cd bolt-end
npm install
npm test
npm run typecheck
npm run dev
npm run build       # dist/index.html, one self-contained file
```

`src/csv.ts` reads the export (BOM, CRLF, quoted cells); `src/templates.ts`
is the sheet geometry; `src/thermal.ts` the Niimbot sizes, text layout and
canvas drawing; `src/niimbot.ts` the Bluetooth printing; `src/main.ts` draws
the settings and the sheets. The sheets are laid out in millimetres and
printed through the browser at exactly that size, with the settings panel
hidden.
