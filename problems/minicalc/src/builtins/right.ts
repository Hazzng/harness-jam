import { ERR, isErr, toNumber, toText } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const RIGHT: Builtin = (args) => {
  const bad = arity(args, 1, 2);
  if (bad) return bad;
  const s = toText(scalar(args[0]));
  if (isErr(s)) return s;
  const nRaw = args.length > 1 ? toNumber(scalar(args[1])) : 1;
  if (isErr(nRaw)) return nRaw;
  const n = Math.floor(nRaw);
  if (n < 0) return ERR.VALUE;
  if (n === 0) return "";
  return s.slice(Math.max(0, s.length - n));
};
