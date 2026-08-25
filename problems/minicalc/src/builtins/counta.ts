import { flatten, type Builtin } from "./kit.js";

/** Every non-empty value, including text, booleans and errors (§4). */
export const COUNTA: Builtin = (args) => {
  let n = 0;
  for (const v of flatten(args)) if (v !== null) n++;
  return n;
};
