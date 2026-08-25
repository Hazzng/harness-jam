import { ERR, isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const ABS: Builtin = (args) => {
  const bad = arity(args, 1, 1);
  if (bad) return bad;
  const v = scalar(args[0]);
  if (isErr(v)) return v;
  if (typeof v === "string") return ERR.VALUE;
  const x = toNumber(v);
  if (isErr(x)) return x;
  return Math.abs(x);
};
