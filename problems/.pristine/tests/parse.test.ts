import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("parse: precedence and associativity", () => {
  it("multiplication and addition", () => {
    const sh = s();
    sh.set("A1", "=1+2*3");
    expect(sh.get("A1")).toBe(7);
  });

  it("chained addition and subtraction", () => {
    const sh = s();
    sh.set("A1", "=10-2-3");
    expect(sh.get("A1")).toBe(5);
  });

  it("chained exponentiation", () => {
    const sh = s();
    sh.set("A1", "=2^3^2");
    expect(sh.get("A1")).toBe(512); // 2^(3^2), not (2^3)^2
  });

  it("unary minus with exponentiation", () => {
    const sh = s();
    sh.set("A1", "=-2^2");
    expect(sh.get("A1")).toBe(-4); // -(2^2), not (-2)^2
  });

  it("a comparison with arithmetic", () => {
    const sh = s();
    sh.set("A1", "=1+1=2");
    sh.set("A2", "=1+1=3");
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
  });

  it("explicit parentheses", () => {
    const sh = s();
    sh.set("A1", "=(1+2)*3");
    expect(sh.get("A1")).toBe(9);
  });
});

describe("parse: literals", () => {
  it("mixed-case boolean literals", () => {
    const sh = s();
    sh.set("A1", "=true");
    sh.set("A2", "=False");
    sh.set("A3", "=TRUE");
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
    expect(sh.get("A3")).toBe(true);
  });

  it("a doubled quote in a string literal", () => {
    const sh = s();
    sh.set("A1", '="he said ""hi"""');
    expect(sh.get("A1")).toBe('he said "hi"');
  });
});

describe("parse: parse errors are #VALUE! (§3)", () => {
  it("unbalanced parentheses", () => {
    const sh = s();
    sh.set("A1", "=(1+2");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a dangling operator", () => {
    const sh = s();
    sh.set("A1", "=1+");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an unterminated string", () => {
    const sh = s();
    sh.set("A1", '="abc');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("trailing tokens", () => {
    const sh = s();
    sh.set("A1", "=1 2");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("parse: unknown function/name is #NAME?", () => {
  it("a bare word", () => {
    const sh = s();
    sh.set("A1", "=FOOBAR");
    expect(sh.get("A1")).toEqual({ err: "#NAME?" });
  });
});

describe("parse: ranges are only legal as a direct function argument (§2)", () => {
  it("a range as a call argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("A3", "3");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(6);
  });

  it("a range in an arithmetic expression", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("A3", "3");
    sh.set("B1", "=A1:A3+1");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});
