import { isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

/** Half away from zero (§9). ROUND(2.5) is 3, ROUND(-2.5) is -3. */
export const ROUND: Builtin = (args) => {
  const bad = arity(args, 1, 2);
  if (bad) return bad;
  const x = toNumber(scalar(args[0]));
  if (isErr(x)) return x;
  const d = args.length > 1 ? toNumber(scalar(args[1])) : 0;
  if (isErr(d)) return d;
  const f = Math.pow(10, Math.abs(Math.trunc(d)));
  const y = Math.trunc(d) >= 0 ? x * f : x / f;
  const r = Math.trunc(y);
  return Math.trunc(d) >= 0 ? r / f : r * f;
};
