import { ERR, isErr } from "../values.js";
import { arity, scalar, type Builtin } from "./kit.js";

export const NOT: Builtin = (args) => {
  const bad = arity(args, 1, 1);
  if (bad) return bad;
  const v = scalar(args[0]);
  if (isErr(v)) return v;
  if (typeof v === "boolean") return !v;
  if (typeof v === "number") return ERR.VALUE;
  if (v === null) return false;
  if (v === "TRUE") return false;
  if (v === "FALSE") return true;
  return ERR.VALUE;
};
