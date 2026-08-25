import { isErr, toText } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const LEN: Builtin = (args) => {
  const bad = arity(args, 1, 1);
  if (bad) return bad;
  const s = toText(scalar(args[0]));
  if (isErr(s)) return s;
  return s.length;
};
