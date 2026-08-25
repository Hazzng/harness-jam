import { numbersIn, type Builtin } from "./kit.js";

export const PRODUCT: Builtin = (args) => {
  const ns = numbersIn(args);
  if (!Array.isArray(ns)) return ns;
  let p = 1;
  for (const n of ns) p *= n;
  return p;
};
