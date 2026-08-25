import { ERR } from "../values.js";
import { flatten, numbersIn, type Builtin } from "./kit.js";

export const AVERAGE: Builtin = (args) => {
  const ns = numbersIn(args);
  if (!Array.isArray(ns)) return ns;
  const seen = flatten(args).filter((v) => v !== null).length;
  if (seen === 0) return ERR.DIV0;
  let total = 0;
  for (const n of ns) total += n;
  return total / seen;
};
