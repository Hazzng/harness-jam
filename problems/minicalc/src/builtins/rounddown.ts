import { truncToward } from "../num.js";
import { isErr, toNumber } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

/** Toward zero (§9). ROUNDDOWN(-2.5) is -2, unlike INT. */
export const ROUNDDOWN: Builtin = (args) => {
  const bad = arity(args, 1, 2);
  if (bad) return bad;
  const x = toNumber(scalar(args[0]));
  if (isErr(x)) return x;
  const d = args.length > 1 ? toNumber(scalar(args[1])) : 0;
  if (isErr(d)) return d;
  return truncToward(x, Math.trunc(d), false);
};
