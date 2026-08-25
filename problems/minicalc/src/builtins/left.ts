import { ERR, isErr, toNumber, toText } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const LEFT: Builtin = (args) => {
  const bad = arity(args, 1, 2);
  if (bad) return bad;
  const s = toText(scalar(args[0]));
  if (isErr(s)) return s;
  const nRaw = args.length > 1 ? toNumber(scalar(args[1])) : 0;
  if (isErr(nRaw)) return nRaw;
  const n = Math.trunc(nRaw);
  if (n < 0) return ERR.VALUE;
  return s.slice(0, n);
};
