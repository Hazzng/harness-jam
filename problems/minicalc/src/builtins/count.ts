import { isErr } from "../values.js";
import { flatten, type Builtin } from "./kit.js";

export const COUNT: Builtin = (args) => {
  let n = 0;
  for (const v of flatten(args)) {
    if (isErr(v)) return v;
    if (v !== null) n++;
  }
  return n;
};
