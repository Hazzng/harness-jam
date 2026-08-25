import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("ROUND", () => {
  it("an exact half", () => {
    const sh = s();
    sh.set("A1", "=ROUND(2.5)");
    expect(sh.get("A1")).toBe(3);
  });

  it("an omitted place argument", () => {
    const sh = s();
    sh.set("A1", "=ROUND(1.6)");
    expect(sh.get("A1")).toBe(2);
  });

  it("a fractional place count", () => {
    const sh = s();
    sh.set("A1", "=ROUND(2.25,1)");
    expect(sh.get("A1")).toBe(2.3);
  });

  it("a negative place count", () => {
    const sh = s();
    sh.set("A1", "=ROUND(45,-1)");
    expect(sh.get("A1")).toBe(50);
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=ROUND("2.6")');
    expect(sh.get("A1")).toBe(3);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", "=ROUND(\"abc\")");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=ROUND(A1)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=ROUND(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=ROUND(A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=ROUND()");
    sh.set("A2", "=ROUND(1,2,3)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
    expect(sh.get("A2")).toEqual({ err: "#VALUE!" });
  });
});

describe("ROUNDUP", () => {
  it("a positive number", () => {
    const sh = s();
    sh.set("A1", "=ROUNDUP(2.1)");
    expect(sh.get("A1")).toBe(3);
  });

  it("a negative number", () => {
    const sh = s();
    sh.set("A1", "=ROUNDUP(-2.1)");
    expect(sh.get("A1")).toBe(-3);
  });

  it("an omitted place argument", () => {
    const sh = s();
    sh.set("A1", "=ROUNDUP(1.01)");
    expect(sh.get("A1")).toBe(2);
  });

  it("a fractional place count", () => {
    const sh = s();
    sh.set("A1", "=ROUNDUP(2.671,2)");
    expect(sh.get("A1")).toBe(2.68);
  });

  it("a negative place count", () => {
    const sh = s();
    sh.set("A1", "=ROUNDUP(41,-1)");
    expect(sh.get("A1")).toBe(50);
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=ROUNDUP("2.1")');
    expect(sh.get("A1")).toBe(3);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=ROUNDUP("abc")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=ROUNDUP(A1)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=ROUNDUP(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=ROUNDUP(A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=ROUNDUP()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("ROUNDDOWN", () => {
  it("a positive number", () => {
    const sh = s();
    sh.set("A1", "=ROUNDDOWN(2.9)");
    expect(sh.get("A1")).toBe(2);
  });

  it("a negative number", () => {
    const sh = s();
    sh.set("A1", "=ROUNDDOWN(-2.5)");
    expect(sh.get("A1")).toBe(-2);
  });

  it("an omitted place argument", () => {
    const sh = s();
    sh.set("A1", "=ROUNDDOWN(1.99)");
    expect(sh.get("A1")).toBe(1);
  });

  it("a fractional place count", () => {
    const sh = s();
    sh.set("A1", "=ROUNDDOWN(2.679,2)");
    expect(sh.get("A1")).toBe(2.67);
  });

  it("a negative place count", () => {
    const sh = s();
    sh.set("A1", "=ROUNDDOWN(49,-1)");
    expect(sh.get("A1")).toBe(40);
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=ROUNDDOWN("2.9")');
    expect(sh.get("A1")).toBe(2);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=ROUNDDOWN("abc")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=ROUNDDOWN(A1)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=ROUNDDOWN(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=ROUNDDOWN(A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=ROUNDDOWN()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("ABS", () => {
  it("a positive number", () => {
    const sh = s();
    sh.set("A1", "=ABS(5)");
    expect(sh.get("A1")).toBe(5);
  });

  it("a negative number", () => {
    const sh = s();
    sh.set("A1", "=ABS(-5)");
    expect(sh.get("A1")).toBe(5);
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=ABS("-3")');
    expect(sh.get("A1")).toBe(3);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=ABS("abc")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=ABS(A1)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=ABS(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=ABS(A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=ABS()");
    sh.set("A2", "=ABS(1,2)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
    expect(sh.get("A2")).toEqual({ err: "#VALUE!" });
  });
});

describe("INT", () => {
  it("a negative fraction", () => {
    const sh = s();
    sh.set("A1", "=INT(-2.5)");
    expect(sh.get("A1")).toBe(-2);
  });

  it("a positive number", () => {
    const sh = s();
    sh.set("A1", "=INT(2.9)");
    expect(sh.get("A1")).toBe(2);
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=INT("2.9")');
    expect(sh.get("A1")).toBe(2);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=INT("abc")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=INT(A1)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=INT(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=INT(A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=INT()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("MOD", () => {
  it("a negative left operand", () => {
    const sh = s();
    sh.set("A1", "=MOD(-1,3)");
    expect(sh.get("A1")).toBe(-1);
  });

  it("a simple remainder", () => {
    const sh = s();
    sh.set("A1", "=MOD(7,3)");
    expect(sh.get("A1")).toBe(1);
  });

  it("a negative dividend", () => {
    const sh = s();
    sh.set("A1", "=MOD(-1,3)");
    expect(sh.get("A1")).toBe(2);
  });

  it("a zero divisor", () => {
    const sh = s();
    sh.set("A1", "=MOD(5,0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=MOD("7",3)');
    expect(sh.get("A1")).toBe(1);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=MOD("abc",3)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=MOD(A1,3)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=MOD(A1:A2,3)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error in the first argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=MOD(A1,3)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("an error in the second argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=MOD(3,A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=MOD(1)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("POWER", () => {
  it("a positive exponent", () => {
    const sh = s();
    sh.set("A1", "=POWER(2,3)");
    expect(sh.get("A1")).toBe(8);
  });

  it("a negative exponent", () => {
    const sh = s();
    sh.set("A1", "=POWER(2,-1)");
    expect(sh.get("A1")).toBe(0.5);
  });

  it("a zero base", () => {
    const sh = s();
    sh.set("A1", "=POWER(0,3)");
    expect(sh.get("A1")).toBe(0);
  });

  it("a zero base with a negative exponent", () => {
    const sh = s();
    sh.set("A1", "=POWER(0,-1)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=POWER("2",3)');
    expect(sh.get("A1")).toBe(8);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=POWER("abc",3)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=POWER(A1,3)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=POWER(A1:A2,3)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=POWER(A1,2)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("an overflowing result", () => {
    const sh = s();
    sh.set("A1", "=POWER(10,1000)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=POWER(2)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("SQRT", () => {
  it("a positive number", () => {
    const sh = s();
    sh.set("A1", "=SQRT(9)");
    expect(sh.get("A1")).toBe(3);
  });

  it("a negative number", () => {
    const sh = s();
    sh.set("A1", "=SQRT(-1)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a zero input", () => {
    const sh = s();
    sh.set("A1", "=SQRT(0)");
    expect(sh.get("A1")).toBe(0);
  });

  it("numeric text argument", () => {
    const sh = s();
    sh.set("A1", '=SQRT("9")');
    expect(sh.get("A1")).toBe(3);
  });

  it("non-numeric text", () => {
    const sh = s();
    sh.set("A1", '=SQRT("abc")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("B1", "=SQRT(A1)");
    expect(sh.get("B1")).toBe(0);
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=SQRT(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=SQRT(A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("wrong argument count", () => {
    const sh = s();
    sh.set("A1", "=SQRT()");
    sh.set("A2", "=SQRT(1,2)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
    expect(sh.get("A2")).toEqual({ err: "#VALUE!" });
  });
});
