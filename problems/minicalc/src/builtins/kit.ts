import { ERR, isErr, type Err, type Value } from "../values.js";

export type Arg =
  | { kind: "scalar"; value: Value }
  | { kind: "range"; values: Value[]; rows: number; cols: number };

export type Builtin = (args: Arg[]) => Value;

/** A range used where a single value is required is #VALUE! (§2). */
export function scalar(a: Arg | undefined): Value {
  if (a === undefined) return null;
  return a.kind === "scalar" ? a.value : ERR.VALUE;
}

/** Flattens every argument to a value list, ranges expanded. */
export function flatten(args: Arg[]): Value[] {
  const out: Value[] = [];
  for (const a of args) {
    if (a.kind === "range") out.push(...a.values);
    else out.push(a.value);
  }
  return out;
}

/**
 * Aggregate collection, per semantics §4: numbers only. Text is ignored even
 * when it parses as a number; booleans and empties are ignored; errors
 * propagate.
 */
export function numbersIn(args: Arg[]): number[] | Err {
  const out: number[] = [];
  for (const v of flatten(args)) {
    if (isErr(v)) return v;
    if (typeof v === "number") out.push(v);
  }
  return out;
}

export function arity(args: Arg[], min: number, max: number): Err | null {
  return args.length < min || args.length > max ? ERR.VALUE : null;
}
