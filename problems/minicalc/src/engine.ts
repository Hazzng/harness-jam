import { BUILTINS } from "./builtins/index.js";
import type { Arg } from "./builtins/kit.js";
import { collectRefs, cycleSet } from "./graph.js";
import { ParseError } from "./lex.js";
import { parse, type Node } from "./parse.js";
import { expandRange, inBounds, normalizeRef, parseRef, rangeShape } from "./refs.js";
import {
  ERR,
  firstErr,
  isErr,
  parseLiteral,
  toNumber,
  type Err,
  type Value,
} from "./values.js";

export class Sheet {
  private readonly raws = new Map<string, string>();
  private readonly asts = new Map<string, Node>();
  private readonly parseErrs = new Map<string, Err>();
  private readonly deps = new Map<string, Set<string>>();
  private readonly rdeps = new Map<string, Set<string>>();
  private readonly cache = new Map<string, Value>();
  private readonly dirty = new Set<string>();
  private cyc: Set<string> | null = null;

  private key(ref: string): string {
    const k = normalizeRef(ref);
    if (k === null) throw new Error(`not a cell reference: ${ref}`);
    return k;
  }

  set(ref: string, text: string): void {
    const cell = this.key(ref);
    this.raws.set(cell, text);
    this.asts.delete(cell);
    this.parseErrs.delete(cell);

    for (const old of this.deps.get(cell) ?? []) this.rdeps.get(old)?.delete(cell);
    this.deps.delete(cell);

    if (text.startsWith("=")) {
      try {
        const ast = parse(text.slice(1));
        this.asts.set(cell, ast);
        const reads = collectRefs(ast);
        this.deps.set(cell, reads);
        for (const r of reads) {
          let s = this.rdeps.get(r);
          if (!s) this.rdeps.set(r, (s = new Set()));
          s.add(cell);
        }
      } catch (e) {
        this.parseErrs.set(cell, { err: (e as ParseError).code });
        this.deps.set(cell, new Set());
      }
    }

    this.cyc = null;
    this.markDirty(cell);
  }

  getRaw(ref: string): string {
    return this.raws.get(this.key(ref)) ?? "";
  }

  /** Every cell that has been set, in insertion order. */
  cells(): string[] {
    return [...this.raws.keys()];
  }

  private markDirty(cell: string): void {
    this.dirty.add(cell);
    this.cache.delete(cell);
    for (const d of this.rdeps.get(cell) ?? []) {
      this.dirty.add(d);
      this.cache.delete(d);
    }
  }

  private cycles(): Set<string> {
    if (this.cyc === null) this.cyc = cycleSet(this.deps);
    return this.cyc;
  }

  get(ref: string): Value {
    const r = parseRef(ref);
    if (!r) throw new Error(`not a cell reference: ${ref}`);
    if (!inBounds(r)) return ERR.REF;
    const cell = this.key(ref);

    if (this.cycles().has(cell)) return ERR.CYCLE;
    if (!this.dirty.has(cell) && this.cache.has(cell)) return this.cache.get(cell)!;

    const v = this.evaluate(cell);
    this.cache.set(cell, v);
    this.dirty.delete(cell);
    return v;
  }

  range(a: string, b: string): Value[] {
    const cells = expandRange(a, b);
    if (!cells) return [ERR.REF];
    return cells.map((c) => this.get(c));
  }

  private evaluate(cell: string): Value {
    const pe = this.parseErrs.get(cell);
    if (pe) return pe;
    const ast = this.asts.get(cell);
    if (!ast) return parseLiteral(this.raws.get(cell) ?? "");
    return this.evalNode(ast);
  }

  private evalNode(n: Node): Value {
    switch (n.k) {
      case "num":
        return n.v;
      case "str":
        return n.v;
      case "bool":
        return n.v;
      case "ref": {
        const r = parseRef(n.ref);
        if (!r || !inBounds(r)) return ERR.REF;
        return this.get(n.ref);
      }
      case "range":
        // A range is only legal as a direct function argument (§2).
        return ERR.VALUE;
      case "call":
        return this.evalCall(n);
      case "un": {
        const v = this.evalNode(n.e);
        const num = toNumber(v);
        if (isErr(num)) return num;
        return n.op === "-" ? -num : num;
      }
      case "bin":
        return this.evalBin(n.op, this.evalNode(n.l), this.evalNode(n.r));
    }
  }

  private evalCall(n: Extract<Node, { k: "call" }>): Value {
    const fn = BUILTINS[n.name];
    if (!fn) return ERR.NAME;
    const args: Arg[] = [];
    for (const a of n.args) {
      if (a.k === "range") {
        const shape = rangeShape(a.a, a.b);
        if (!shape) return ERR.REF;
        args.push({
          kind: "range",
          values: shape.cells.map((c) => this.get(c)),
          rows: shape.rows,
          cols: shape.cols,
        });
      } else {
        args.push({ kind: "scalar", value: this.evalNode(a) });
      }
    }
    return fn(args);
  }

  private evalBin(op: string, lv: Value, rv: Value): Value {
    const e = firstErr(rv, lv);
    if (e) return e;

    if (op === "=" || op === "<>" || op === "<" || op === "<=" || op === ">" || op === ">=") {
      let cmp: number;
      if (typeof lv === "string" && typeof rv === "string") {
        const a = lv.toUpperCase();
        const b = rv.toUpperCase();
        cmp = a < b ? -1 : a > b ? 1 : 0;
      } else {
        const a = toNumber(lv);
        if (isErr(a)) return a;
        const b = toNumber(rv);
        if (isErr(b)) return b;
        cmp = a < b ? -1 : a > b ? 1 : 0;
      }
      switch (op) {
        case "=":
          return cmp === 0;
        case "<>":
          return cmp !== 0;
        case "<":
          return cmp < 0;
        case "<=":
          return cmp <= 0;
        case ">":
          return cmp > 0;
        default:
          return cmp >= 0;
      }
    }

    const a = toNumber(lv);
    if (isErr(a)) return a;
    const b = toNumber(rv);
    if (isErr(b)) return b;

    let out: number;
    switch (op) {
      case "+":
        out = a + b;
        break;
      case "-":
        out = a - b;
        break;
      case "*":
        out = a * b;
        break;
      case "/":
        if (b === 0) return ERR.DIV0;
        out = a / b;
        break;
      case "^":
        if (a === 0 && b < 0) return ERR.DIV0;
        out = Math.pow(a, b);
        break;
      default:
        return ERR.VALUE;
    }
    return Number.isFinite(out) ? out : ERR.VALUE;
  }
}
