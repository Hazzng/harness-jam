/** Zero-based index of the last legal column, ZZ. */
export const MAX_COL = 701;
/** Largest legal 1-based row number. Row indices are zero-based, so the
 *  bound check is `< MAX_ROW`, not `<=`. */
export const MAX_ROW = 999999;
const MAX_RANGE_CELLS = 100000;

export interface Ref {
  /** zero-based */
  col: number;
  /** zero-based */
  row: number;
}

export function colToIndex(s: string): number {
  let n = 0;
  for (const ch of s.toUpperCase()) {
    const d = ch.charCodeAt(0) - 64; // A = 1
    if (d < 1 || d > 26) return -1;
    n = n * 26 + d;
  }
  return n - 1;
}

export function indexToCol(i: number): string {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

const REF_RE = /^\$?([A-Za-z]{1,3})\$?(\d{1,9})$/;

/** Parses `A1`, `$A$1`. Returns null if it is not ref-shaped at all. */
export function parseRef(s: string): Ref | null {
  const m = REF_RE.exec(s);
  if (!m) return null;
  const col = colToIndex(m[1]!);
  const row = Number(m[2]!) - 1;
  if (col < 0 || row < 0) return null;
  return { col, row };
}

export function inBounds(r: Ref): boolean {
  return r.col >= 0 && r.col <= MAX_COL && r.row >= 0 && r.row < MAX_ROW;
}

export function refToA1(r: Ref): string {
  return indexToCol(r.col) + String(r.row + 1);
}

/** Canonical `A1` form, or null when unparseable. Does not bounds-check. */
export function normalizeRef(s: string): string | null {
  const r = parseRef(s);
  return r ? refToA1(r) : null;
}

export interface RangeShape {
  /** row-major */
  cells: string[];
  rows: number;
  cols: number;
}

/** Row-major cells plus dimensions. Null when out of bounds or too large. */
export function rangeShape(a: string, b: string): RangeShape | null {
  const ra = parseRef(a);
  const rb = parseRef(b);
  if (!ra || !rb || !inBounds(ra) || !inBounds(rb)) return null;
  const c0 = Math.min(ra.col, rb.col);
  const c1 = Math.max(ra.col, rb.col);
  const r0 = Math.min(ra.row, rb.row);
  const r1 = Math.max(ra.row, rb.row);
  const rows = r1 - r0 + 1;
  const cols = c1 - c0 + 1;
  if (rows * cols > MAX_RANGE_CELLS) return null;
  const cells: string[] = [];
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      cells.push(refToA1({ col, row }));
    }
  }
  return { cells, rows, cols };
}

/** Row-major cell list for a range. Null when out of bounds or too large. */
export function expandRange(a: string, b: string): string[] | null {
  return rangeShape(a, b)?.cells ?? null;
}
