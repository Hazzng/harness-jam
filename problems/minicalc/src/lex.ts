import type { ErrCode } from "./values.js";

export class ParseError extends Error {
  constructor(public readonly code: ErrCode) {
    super(code);
  }
}

export type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "name"; v: string }
  | { t: "op"; v: string }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "comma" }
  | { t: "colon" };

const NAME_START = /[A-Za-z_$]/;
const NAME_REST = /[A-Za-z0-9_.$]/;
const DIGIT = /\d/;
const OPS3: string[] = [];
const OPS2 = ["<>", "<=", ">="];
const OPS1 = ["+", "-", "*", "/", "^", "=", "<", ">"];

export function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "(") {
      out.push({ t: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      out.push({ t: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      out.push({ t: "comma" });
      i++;
      continue;
    }
    if (ch === ":") {
      out.push({ t: "colon" });
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = "";
      for (;;) {
        if (j >= src.length) throw new ParseError("#VALUE!");
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            s += '"';
            j += 2;
            continue;
          }
          j++;
          break;
        }
        s += src[j];
        j++;
      }
      out.push({ t: "str", v: s });
      i = j;
      continue;
    }
    if (DIGIT.test(ch) || (ch === "." && DIGIT.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && DIGIT.test(src[j]!)) j++;
      if (src[j] === ".") {
        j++;
        while (j < src.length && DIGIT.test(src[j]!)) j++;
      }
      if (src[j] === "e" || src[j] === "E") {
        let k = j + 1;
        if (src[k] === "+" || src[k] === "-") k++;
        if (DIGIT.test(src[k] ?? "")) {
          k++;
          while (k < src.length && DIGIT.test(src[k]!)) k++;
          j = k;
        }
      }
      const n = Number(src.slice(i, j));
      if (!Number.isFinite(n)) throw new ParseError("#VALUE!");
      out.push({ t: "num", v: n });
      i = j;
      continue;
    }
    if (NAME_START.test(ch)) {
      let j = i;
      while (j < src.length && NAME_REST.test(src[j]!)) j++;
      out.push({ t: "name", v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS2.includes(two)) {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if (OPS1.includes(ch)) {
      out.push({ t: "op", v: ch });
      i++;
      continue;
    }
    void OPS3;
    throw new ParseError("#VALUE!");
  }
  return out;
}
