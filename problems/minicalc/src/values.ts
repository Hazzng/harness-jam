export type ErrCode =
  | "#VALUE!"
  | "#DIV/0!"
  | "#REF!"
  | "#CYCLE!"
  | "#NAME?"
  | "#N/A";

export interface Err {
  readonly err: ErrCode;
}

/** `null` is the empty cell. */
export type Value = number | string | boolean | Err | null;

export const ERR = {
  VALUE: { err: "#VALUE!" } as Err,
  DIV0: { err: "#DIV/0!" } as Err,
  REF: { err: "#REF!" } as Err,
  CYCLE: { err: "#CYCLE!" } as Err,
  NAME: { err: "#NAME?" } as Err,
  NA: { err: "#N/A" } as Err,
} as const;

export function isErr(v: Value): v is Err {
  return typeof v === "object" && v !== null && "err" in v;
}

export function firstErr(...vs: Value[]): Err | undefined {
  for (const v of vs) if (isErr(v)) return v;
  return undefined;
}

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** Text that parses as a number, else null. */
export function parseNumeric(s: string): number | null {
  const t = s.trim();
  if (t === "" || !NUMERIC.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Raw cell text to a value, per semantics §1. Formulas are handled upstream. */
export function parseLiteral(raw: string): Value {
  if (raw === "") return null;
  const upper = raw.toUpperCase();
  if (upper === "TRUE") return true;
  if (upper === "FALSE") return false;
  const n = parseNumeric(raw);
  if (n !== null) return n;
  return raw;
}

/** Scalar coercion, per semantics §4. */
export function toNumber(v: Value): number | Err {
  if (isErr(v)) return v;
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = parseNumeric(v);
  return n === null ? ERR.VALUE : n;
}

export function toBool(v: Value): boolean | Err {
  if (isErr(v)) return v;
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const u = v.toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  return ERR.VALUE;
}

export function numToStr(n: number): string {
  if (Object.is(n, -0)) return "0";
  return String(n);
}

export function toText(v: Value): string | Err {
  if (isErr(v)) return v;
  if (v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return numToStr(v);
}

/** Display form, used by CSV export. Errors render as their code. */
export function display(v: Value): string {
  if (isErr(v)) return v.err;
  const t = toText(v);
  return isErr(t) ? t.err : t;
}
