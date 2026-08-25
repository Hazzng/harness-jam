import { SUM } from "./sum.js";
import { AVERAGE } from "./average.js";
import { MIN } from "./min.js";
import { MAX } from "./max.js";
import { COUNT } from "./count.js";
import { COUNTA } from "./counta.js";
import { PRODUCT } from "./product.js";
import { ROUND } from "./round.js";
import { ROUNDUP } from "./roundup.js";
import { ROUNDDOWN } from "./rounddown.js";
import { ABS } from "./abs.js";
import { INT } from "./int.js";
import { MOD } from "./mod.js";
import { POWER } from "./power.js";
import { SQRT } from "./sqrt.js";
import { IF } from "./if.js";
import { AND } from "./and.js";
import { OR } from "./or.js";
import { NOT } from "./not.js";
import { IFERROR } from "./iferror.js";
import { CONCAT } from "./concat.js";
import { LEN } from "./len.js";
import { TRIM } from "./trim.js";
import { UPPER } from "./upper.js";
import { LOWER } from "./lower.js";
import { LEFT } from "./left.js";
import { RIGHT } from "./right.js";
import { VLOOKUP } from "./vlookup.js";
import type { Builtin } from "./kit.js";

/** One function per file. The registry is the only place they meet. */
export const BUILTINS: Record<string, Builtin> = {
  SUM,
  AVERAGE,
  MIN,
  MAX,
  COUNT,
  COUNTA,
  PRODUCT,
  ROUND,
  ROUNDUP,
  ROUNDDOWN,
  ABS,
  INT,
  MOD,
  POWER,
  SQRT,
  IF,
  AND,
  OR,
  NOT,
  IFERROR,
  CONCAT,
  LEN,
  TRIM,
  UPPER,
  LOWER,
  LEFT,
  RIGHT,
  VLOOKUP,
};

export const BUILTIN_NAMES = Object.keys(BUILTINS);
