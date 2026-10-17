// The shape of a calculator: fields in, rows out. tools*.ts fill these in and
// main.ts draws them.

import { CM_PER_IN, type Unit } from './units';

export type Value = number | string | boolean | null;
export type Values = Record<string, Value>;

/** A default that differs by unit: `in` is given in inches. */
export type UnitDefault = number | { cm: number; in: number };

interface FieldBase {
  key: string;
  label: string;
  hint?: string;
  wide?: boolean;
  showIf?: (v: Values) => boolean;
}
export type Field =
  | (FieldBase & { kind: 'length'; default: UnitDefault | null; /** typed and shown in metres or yards */ long?: boolean })
  | (FieldBase & { kind: 'number'; default: number | null; suffix?: string })
  | (FieldBase & { kind: 'percent'; default: number | null })
  | (FieldBase & { kind: 'int'; default: number | null })
  | (FieldBase & { kind: 'select'; default: string; options: Array<{ value: string; label: string }>; sets?: (value: string, unit: Unit) => Values })
  | (FieldBase & { kind: 'check'; default: boolean })
  | (FieldBase & { kind: 'text'; default: string; placeholder?: string })
  | (FieldBase & { kind: 'lines'; default: string; placeholder?: string });

export interface Cell { text: string; cls?: string }
export interface Output {
  headline?: { label: string; value: string; note?: string };
  rows?: Array<{ label: string; value: string; sub?: string }>;
  table?: { head: string[]; rows: Cell[][]; numeric?: boolean[] };
  notes?: string[];
  warn?: string;
  cards?: Array<{ title: string; subtitle: string; pairs: Array<[string, string]>; tip: string }>;
  empty?: string;
}

export type Group = 'Cutting' | 'Fitting' | 'Buying' | 'Machine';
export const GROUPS: Group[] = ['Cutting', 'Fitting', 'Buying', 'Machine'];

export interface Tool {
  id: string;
  name: string;
  group: Group;
  blurb: string;
  fields: Field[];
  compute: (v: Values, unit: Unit) => Output;
}

export function resolveDefault(d: UnitDefault | null, unit: Unit): number | null {
  if (d === null) return null;
  if (typeof d === 'number') return d;
  return unit === 'in' ? d.in * CM_PER_IN : d.cm;
}

export const num = (v: Values, key: string): number | null => (typeof v[key] === 'number' ? (v[key] as number) : null);
export const str = (v: Values, key: string): string => (typeof v[key] === 'string' ? (v[key] as string) : '');
export const bool = (v: Values, key: string): boolean => v[key] === true;
export const pct = (v: Values, key: string): number | null => {
  const n = num(v, key);
  return n === null ? null : n / 100;
};

export const SA: UnitDefault = { cm: 1.5, in: 0.625 };
export const SA_NARROW: UnitDefault = { cm: 1, in: 0.375 };
export const WIDTH: UnitDefault = { cm: 150, in: 60 };
export const WIDTH_NARROW: UnitDefault = { cm: 115, in: 45 };
