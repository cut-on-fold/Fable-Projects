import { describe, expect, it } from 'vitest';
import { crc32, zipStored } from '../src/zip';

const bytes = (s: string) => new TextEncoder().encode(s);

describe('crc32', () => {
  it('matches the standard check values', () => {
    expect(crc32(bytes('hello')).toString(16)).toBe('3610a686');
    expect(crc32(bytes('123456789')).toString(16)).toBe('cbf43926');
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('zipStored', () => {
  const a = bytes('hello');
  const b = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]);
  const zip = zipStored([{ name: 'grid.json', data: a }, { name: 'plain.png', data: b }], new Date(2026, 9, 31, 21, 4, 10));
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  it('lays each entry out as a local header, the name, then the bytes themselves', () => {
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0); // stored
    expect(view.getUint32(14, true)).toBe(0x3610a686);
    expect(view.getUint32(18, true)).toBe(5);
    expect(view.getUint16(26, true)).toBe(9);
    expect(new TextDecoder().decode(zip.subarray(30, 39))).toBe('grid.json');
    expect(Array.from(zip.subarray(39, 44))).toEqual(Array.from(a));
    const second = 44;
    expect(view.getUint32(second, true)).toBe(0x04034b50);
    expect(view.getUint32(second + 18, true)).toBe(8);
    expect(Array.from(zip.subarray(second + 30 + 9, second + 30 + 9 + 8))).toEqual(Array.from(b));
  });

  it('ends with a central directory that points back at the entries', () => {
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const cdOffset = view.getUint32(end + 16, true);
    const cdSize = view.getUint32(end + 12, true);
    expect(cdOffset + cdSize).toBe(end);
    expect(view.getUint32(cdOffset, true)).toBe(0x02014b50);
    expect(view.getUint32(cdOffset + 42, true)).toBe(0); // the first entry starts the file
    const secondHeader = cdOffset + 46 + 9;
    expect(view.getUint32(secondHeader, true)).toBe(0x02014b50);
    expect(view.getUint32(secondHeader + 42, true)).toBe(44);
    expect(new TextDecoder().decode(zip.subarray(secondHeader + 46, secondHeader + 46 + 9))).toBe('plain.png');
  });

  it('carries the date in DOS form', () => {
    const date = view.getUint16(12, true);
    expect(date >> 9).toBe(2026 - 1980);
    expect((date >> 5) & 15).toBe(10);
    expect(date & 31).toBe(31);
    const time = view.getUint16(10, true);
    expect(time >> 11).toBe(21);
    expect((time >> 5) & 63).toBe(4);
    expect((time & 31) * 2).toBe(10);
  });
});
