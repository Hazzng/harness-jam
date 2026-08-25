import { ERR, isErr, toBool } from "../values.js";
import { flatten, type Builtin } from "./kit.js";

export const OR: Builtin = (args) => {
  let seen = 0;
  let out = false;
  for (const v of flatten(args)) {
    if (isErr(v)) return v;
    if (v === null) continue;
    const b = toBool(v);
    if (isErr(b)) return b;
    seen++;
    if (b) return true;
  }
  return seen === 0 ? ERR.VALUE : out;
};
