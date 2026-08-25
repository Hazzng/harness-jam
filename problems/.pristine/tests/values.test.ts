import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("values: raw text to value (§1)", () => {
  it("a never-set cell", () => {
    const sh = s();
    expect(sh.get("Z9")).toBeNull();
  });

  it("numeric-looking text", () => {
    const sh = s();
    sh.set("A1", "42");
    sh.set("A2", "-3.5");
    sh.set("A3", "1e3");
    expect(sh.get("A1")).toBe(42);
    expect(sh.get("A2")).toBe(-3.5);
    expect(sh.get("A3")).toBe(1000);
  });

  it("mixed-case boolean text", () => {
    const sh = s();
    sh.set("A1", "true");
    sh.set("A2", "FALSE");
    sh.set("A3", "TrUe");
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
    expect(sh.get("A3")).toBe(true);
  });

  it("plain text with spaces", () => {
    const sh = s();
    sh.set("A1", " hello ");
    sh.set("A2", "12abc");
    expect(sh.get("A1")).toBe(" hello ");
    expect(sh.get("A2")).toBe("12abc");
  });
});

describe("values: scalar vs aggregate coercion (§4)", () => {
  it("numeric text in scalar context", () => {
    const sh = s();
    sh.set("A1", '="7"+1');
    expect(sh.get("A1")).toBe(8);
  });

  it("non-numeric text in scalar context", () => {
    const sh = s();
    sh.set("A1", '="abc"+1');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("numeric-looking text in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", '="7"'); // a formula producing the text "7", not the number
    sh.set("A3", "2");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("a boolean in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "TRUE");
    sh.set("A3", "2");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("an error in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "=1/0");
    sh.set("A3", "2");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("a boolean in scalar context", () => {
    const sh = s();
    sh.set("A1", "=TRUE+1");
    sh.set("A2", "=FALSE*5");
    expect(sh.get("A1")).toBe(2);
    expect(sh.get("A2")).toBe(0);
  });
});

describe("values: comparisons (§4)", () => {
  it("two text operands", () => {
    const sh = s();
    sh.set("A1", '="abc"="ABC"');
    sh.set("A2", '="abc"<"abd"');
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(true);
  });

  it("one text and one numeric operand", () => {
    const sh = s();
    sh.set("A1", '=10>"9"');
    expect(sh.get("A1")).toBe(true);
  });
});

describe("values: error precedence, leftmost wins (§3)", () => {
  it("multiple error arguments", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("A2", "=UNKNOWNFN()");
    sh.set("B1", "=A1+A2");
    sh.set("B2", "=A2+A1");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
    expect(sh.get("B2")).toEqual({ err: "#NAME?" });
  });
});
