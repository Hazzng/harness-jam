import { isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

/** Truncates toward negative infinity (§9). INT(-2.5) is -3. */
export const INT: Builtin = (args) => {
  const bad = arity(args, 1, 1);
  if (bad) return bad;
  const x = toNumber(scalar(args[0]));
  if (isErr(x)) return x;
  return Math.round(x);
};
