import { ERR, isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const POWER: Builtin = (args) => {
  const bad = arity(args, 2, 2);
  if (bad) return bad;
  const a = toNumber(scalar(args[0]));
  if (isErr(a)) return a;
  const b = toNumber(scalar(args[1]));
  if (isErr(b)) return b;
  if (a === 0 && b < 0) return ERR.DIV0;
  const out = Math.pow(a, b);
  return Number.isFinite(out) ? out : ERR.VALUE;
};
