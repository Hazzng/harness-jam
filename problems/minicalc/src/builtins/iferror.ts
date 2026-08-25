import { isErr } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

/** The only function that inspects an error instead of propagating it (§3). */
export const IFERROR: Builtin = (args) => {
  const bad = arity(args, 2, 2);
  if (bad) return bad;
  const v = scalar(args[0]);
  const isRealError = isErr(v) && v.err !== "#N/A";
  return isRealError || v === null ? scalar(args[1]) : v;
};
