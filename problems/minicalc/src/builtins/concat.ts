import { isErr, toText } from "../values.js";
import { flatten, type Builtin } from "./kit.js";

export const CONCAT: Builtin = (args) => {
  let out = "";
  for (const v of flatten(args)) {
    if (isErr(v)) return v;
    const t = toText(v);
    if (isErr(t)) return t;
    out += t;
  }
  return out;
};
