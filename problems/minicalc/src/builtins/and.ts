import { isErr, toBool } from "../values.js";
import { flatten, type Builtin } from "./kit.js";

export const AND: Builtin = (args) => {
  let out = true;
  for (const v of flatten(args)) {
    if (isErr(v)) return v;
    if (v === null) continue;
    const b = toBool(v);
    if (isErr(b)) return b;
    if (!b) out = false;
  }
  return out;
};
