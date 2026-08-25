import { numbersIn, type Builtin } from "./kit.js";

export const MIN: Builtin = (args) => {
  const ns = numbersIn(args);
  if (!Array.isArray(ns)) return ns;
  if (ns.length === 0) return 0;
  let m = 0;
  for (const n of ns) if (n < m) m = n;
  return m;
};
