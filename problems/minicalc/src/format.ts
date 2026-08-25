import { roundHalfAwayFromZero } from "./num.js";
import { ERR, isErr, toNumber, type Value } from "./values.js";

const SPEC = /^(#,##)?0(?:\.(0+))?(%)?$/;

/**
 * Number formatting, per semantics §8. Supported specs: `0`, `0.00` with any
 * number of decimals, `#,##0`, `0%`. Rounds half away from zero.
 */
export function format(v: Value, spec: string): string {
  if (isErr(v)) return v.err;
  const m = SPEC.exec(spec);
  if (!m) return ERR.VALUE.err;
  const n = toNumber(v);
  if (isErr(n)) return n.err;

  const group = m[1] !== undefined;
  const digits = m[2]?.length ?? 0;
  const pct = m[3] !== undefined;

  const scaled = pct ? n * 100 : n;
  const r = roundHalfAwayFromZero(scaled, digits);
  let body = Math.abs(r).toFixed(digits);

  if (group) {
    const dot = body.indexOf(".");
    const whole = dot === -1 ? body : body.slice(0, dot);
    const rest = dot === -1 ? "" : body.slice(dot);
    body = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + rest;
  }

  const sign = r < 0 ? "-" : "";
  return sign + body + (pct ? "%" : "");
}
