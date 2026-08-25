import type { Sheet } from "./engine.js";
import { indexToCol, refToA1 } from "./refs.js";

/** Splits one CSV document into rows of raw fields. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i++;
      continue;
    }
    if (ch === ",") {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/** Fills cells from A1, row-major, storing each field as raw text (§7). */
export function fromCSV(sheet: Sheet, text: string): void {
  const rows = parseCSV(text);
  for (let r = 0; r < rows.length; r++) {
    const cols = rows[r]!;
    for (let c = 0; c < cols.length; c++) {
      sheet.set(refToA1({ col: c, row: r }), cols[c]!);
    }
  }
}

function quote(s: string): string {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Emits evaluated values for a rectangular region (§7). */
export function toCSV(sheet: Sheet, rows: number, cols: number): string {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const line: string[] = [];
    for (let c = 0; c < cols; c++) {
      line.push(quote(sheet.getRaw(indexToCol(c) + String(r + 1))));
    }
    out.push(line.join(","));
  }
  return out.join("\n");
}
