import { ERR, isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

/** Takes the sign of the divisor (§10). MOD(-1, 3) is 2. */
export const MOD: Builtin = (args) => {
  const bad = arity(args, 2, 2);
  if (bad) return bad;
  const a = toNumber(scalar(args[0]));
  if (isErr(a)) return a;
  const b = toNumber(scalar(args[1]));
  if (isErr(b)) return b;
  if (b === 0) return ERR.DIV0;
  return a % b;
};
