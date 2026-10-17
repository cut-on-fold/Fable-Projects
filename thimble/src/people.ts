// People and their measurements, kept in this browser, so the calculators
// can fill their body fields from a name. Read from Stash's Measurements.csv
// export or typed in. Measurements are stored in cm under Stash's column
// labels ("Waist", "High bust", "Full bust / chest", "Hips", "Wrist
// circumference" …).

import { parseLength } from './units';

export interface Person {
  name: string;
  measures: Record<string, number>;
}

/** The measurements calculators ask for, with the Stash column that holds each. */
export const BODY_FIELDS: Array<{ column: string; label: string }> = [
  { column: 'High bust', label: 'High bust' },
  { column: 'Full bust / chest', label: 'Full bust' },
  { column: 'Waist', label: 'Waist' },
  { column: 'Hips', label: 'Hips' },
  { column: 'Wrist circumference', label: 'Wrist' },
  { column: 'Bicep', label: 'Bicep' },
  { column: 'Height', label: 'Height' },
];

/** A small CSV reader: BOM, CRLF, quoted cells with doubled quotes. */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const s = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  const header = (nonEmpty.shift() ?? []).map((h) => h.trim());
  return { header, rows: nonEmpty.map((r) => header.map((_, k) => (r[k] ?? '').trim())) };
}

/**
 * People from a Stash Measurements.csv. Values carry their unit ("39.5 in",
 * "100 cm"); a bare number is taken as inches, which is what Stash writes
 * for measurements unless the category was switched to metric.
 */
export function peopleFromCsv(text: string): Person[] {
  const { header, rows } = parseCsv(text);
  const nameCol = header.indexOf('Name');
  if (nameCol < 0) return [];
  const statusCol = header.indexOf('Status');
  const people: Person[] = [];
  for (const r of rows) {
    const name = r[nameCol] ?? '';
    if (!name) continue;
    if (statusCol >= 0 && r[statusCol] && r[statusCol] !== 'Current') continue;
    const measures: Record<string, number> = {};
    header.forEach((h, k) => {
      if (k === nameCol || k === statusCol || h === 'Notes' || h === 'Photos') return;
      const cm = parseLength(r[k] ?? '', 'in');
      if (cm !== null && cm > 0) measures[h] = cm;
    });
    if (Object.keys(measures).length) people.push({ name, measures });
  }
  return people;
}

/** Add or replace people by name. */
export function mergePeople(existing: Person[], incoming: Person[]): Person[] {
  const byName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));
  for (const p of incoming) byName.set(p.name.toLowerCase(), p);
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
