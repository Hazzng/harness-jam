import { ERR, isErr, toBool, toNumber, type Value } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

function matches(cell: Value, key: Value): boolean {
  if (typeof cell === "string" && typeof key === "string") {
    return cell.toUpperCase() === key.toUpperCase();
  }
  const a = toNumber(cell);
  const b = toNumber(key);
  if (isErr(a) || isErr(b)) return false;
  return a === b;
}

/**
 * VLOOKUP(key, table, colIndex, [exact]). Unlike Excel, `exact` defaults to
 * TRUE (§12). Approximate mode assumes the first column is sorted ascending
 * and returns the last row not greater than the key.
 */
export const VLOOKUP: Builtin = (args) => {
  const bad = arity(args, 3, 4);
  if (bad) return bad;
  const key = scalar(args[0]);
  if (isErr(key)) return key;
  const table = args[1];
  if (!table || table.kind !== "range") return ERR.VALUE;
  const idxRaw = toNumber(scalar(args[2]));
  if (isErr(idxRaw)) return idxRaw;
  const idx = Math.trunc(idxRaw) - 1;
  if (idx < 1 || idx > table.cols) return ERR.VALUE;

  let exact = true;
  if (args.length > 3) {
    const e = toBool(scalar(args[3]));
    if (isErr(e)) return e;
    exact = e;
  }

  const { values, rows, cols } = table;
  if (exact) {
    for (let r = 0; r < rows; r++) {
      const cell = values[r * cols]!;
      if (isErr(cell)) return cell;
      if (matches(cell, key)) return values[r * cols + idx]!;
    }
    return ERR.NA;
  }

  const k = toNumber(key);
  if (isErr(k)) return k;
  let best = -1;
  for (let r = 0; r < rows; r++) {
    const cell = values[r * cols]!;
    if (isErr(cell)) return cell;
    const n = toNumber(cell);
    if (isErr(n)) continue;
    if (n <= k) best = r;
    else break;
  }
  return best < 0 ? ERR.NA : values[best * cols + idx]!;
};
