// A small CSV reader for the files Stash exports: a BOM, CRLF line ends,
// quoted cells with doubled quotes and line breaks inside them.

export interface Table {
  header: string[];
  rows: string[][];
}

export function parseCsv(text: string): Table {
  const s = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  const header = (nonEmpty.shift() ?? []).map((h) => h.trim());
  return { header, rows: nonEmpty.map((r) => header.map((_, k) => (r[k] ?? '').trim())) };
}

export interface Record {
  [column: string]: string;
}

export function toRecords(t: Table): Record[] {
  return t.rows.map((r) => Object.fromEntries(t.header.map((h, k) => [h, r[k] ?? ''])));
}

/** Columns worth printing on a label, in the order they usually matter. */
export const PREFERRED_COLUMNS = [
  'Fabric type', 'Composition', 'Width', 'Remaining length', 'Weight', 'Prewashed', 'Fabric category',
  'Designer', 'Garment type', 'Size range', 'Cup sizes', 'Format',
  'Type', 'Brand', 'Zip size', 'Opening', 'Length', 'Colour number', 'Range', 'Quantity',
  'Colours', 'Location', 'Shop', 'Purchase date',
];

/** A sensible starting choice of columns for a table: up to `max` of the preferred ones it has. */
export function defaultColumns(header: string[], max = 5): string[] {
  return PREFERRED_COLUMNS.filter((c) => header.includes(c)).slice(0, max);
}

export function statuses(records: Record[]): string[] {
  return [...new Set(records.map((r) => r.Status ?? '').filter(Boolean))].sort();
}
