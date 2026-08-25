import { isErr, toBool } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

/** The omitted third argument is FALSE. */
export const IF: Builtin = (args) => {
  const bad = arity(args, 2, 3);
  if (bad) return bad;
  const c = toBool(scalar(args[0]));
  if (isErr(c)) return c;
  if (c) return scalar(args[1]);
  return args.length > 2 ? scalar(args[2]) : null;
};
