import { isErr, parseNumeric } from "../values.js";
import { flatten, type Builtin } from "./kit.js";

export const SUM: Builtin = (args) => {
  let total = 0;
  for (const v of flatten(args)) {
    if (isErr(v)) return v;
    if (typeof v === "number") total += v;
    else if (typeof v === "string") {
      const n = parseNumeric(v);
      if (n !== null) total += n;
    }
  }
  return total;
};
