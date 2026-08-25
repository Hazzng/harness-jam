import { isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const SQRT: Builtin = (args) => {
  const bad = arity(args, 1, 1);
  if (bad) return bad;
  const x = toNumber(scalar(args[0]));
  if (isErr(x)) return x;
  return Math.sqrt(x);
};
