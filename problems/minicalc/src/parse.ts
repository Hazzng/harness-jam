import { lex, ParseError, type Tok } from "./lex.js";
import { normalizeRef } from "./refs.js";

export type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "ref"; ref: string }
  | { k: "range"; a: string; b: string }
  | { k: "call"; name: string; args: Node[] }
  | { k: "bin"; op: string; l: Node; r: Node }
  | { k: "un"; op: string; e: Node };

class Parser {
  private i = 0;
  constructor(private readonly toks: Tok[]) {}

  private peek(): Tok | undefined {
    return this.toks[this.i];
  }
  private next(): Tok {
    const t = this.toks[this.i];
    if (!t) throw new ParseError("#VALUE!");
    this.i++;
    return t;
  }
  private eat(t: Tok["t"]): boolean {
    if (this.peek()?.t === t) {
      this.i++;
      return true;
    }
    return false;
  }
  private expect(t: Tok["t"]): void {
    if (!this.eat(t)) throw new ParseError("#VALUE!");
  }
  private isOp(...ops: string[]): string | null {
    const p = this.peek();
    if (p && p.t === "op" && ops.includes(p.v)) return p.v;
    return null;
  }

  parseTop(): Node {
    const n = this.cmp();
    if (this.i !== this.toks.length) throw new ParseError("#VALUE!");
    return n;
  }

  private cmp(): Node {
    let l = this.add();
    for (;;) {
      const op = this.isOp("=", "<>", "<", "<=", ">", ">=");
      if (!op) return l;
      this.next();
      l = { k: "bin", op, l, r: this.add() };
    }
  }

  private add(): Node {
    let l = this.mul();
    for (;;) {
      const op = this.isOp("+", "-");
      if (!op) return l;
      this.next();
      l = { k: "bin", op, l, r: this.mul() };
    }
  }

  private mul(): Node {
    let l = this.unary();
    for (;;) {
      const op = this.isOp("*", "/");
      if (!op) return l;
      this.next();
      l = { k: "bin", op, l, r: this.unary() };
    }
  }

  private unary(): Node {
    const op = this.isOp("+", "-");
    if (op) {
      this.next();
      return { k: "un", op, e: this.unary() };
    }
    return this.power();
  }

  /** `^` is right-associative and binds tighter than unary minus's operand. */
  private power(): Node {
    const base = this.primary();
    if (this.isOp("^")) {
      this.next();
      return { k: "bin", op: "^", l: base, r: this.unary() };
    }
    return base;
  }

  private primary(): Node {
    const t = this.next();
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "lparen") {
      const e = this.cmp();
      this.expect("rparen");
      return e;
    }
    if (t.t === "name") {
      const upper = t.v.toUpperCase();
      if (this.peek()?.t === "lparen") {
        this.next();
        const args: Node[] = [];
        if (this.peek()?.t !== "rparen") {
          for (;;) {
            args.push(this.cmp());
            if (this.eat("comma")) continue;
            break;
          }
        }
        this.expect("rparen");
        return { k: "call", name: upper, args };
      }
      if (upper === "TRUE") return { k: "bool", v: true };
      if (upper === "FALSE") return { k: "bool", v: false };
      const ref = normalizeRef(t.v);
      if (ref === null) throw new ParseError("#NAME?");
      if (this.peek()?.t === "colon") {
        this.next();
        const t2 = this.next();
        if (t2.t !== "name") throw new ParseError("#VALUE!");
        const ref2 = normalizeRef(t2.v);
        if (ref2 === null) throw new ParseError("#NAME?");
        return { k: "range", a: ref, b: ref2 };
      }
      return { k: "ref", ref };
    }
    throw new ParseError("#VALUE!");
  }
}

/** Parses a formula body (no leading `=`). Throws ParseError. */
export function parse(src: string): Node {
  return new Parser(lex(src)).parseTop();
}
