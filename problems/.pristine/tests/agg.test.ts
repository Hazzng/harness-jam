import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("SUM", () => {
  it("a column typed as text", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "=CONCAT(\"7\")");
    sh.set("A3", "2");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(10);
  });

  it("a range of numbers", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("A3", "3");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(6);
  });

  it("mixed scalar and range arguments", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=SUM(A1:A2,10)");
    expect(sh.get("B1")).toBe(13);
  });

  it("numeric-looking text in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", '=CONCAT("7")');
    sh.set("B1", "=SUM(A1:A2)");
    sh.set("B2", '="7"+1');
    expect(sh.get("B1")).toBe(1);
    expect(sh.get("B2")).toBe(8);
  });

  it("booleans in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "TRUE");
    sh.set("A3", "2");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "");
    sh.set("A3", "2");
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("an error in the range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "=1/0");
    sh.set("B1", "=SUM(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=SUM()");
    expect(sh.get("B1")).toBe(0);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=SUM(A1:A3)");
    expect(sh.get("B1")).toBe(0);
  });
});

describe("AVERAGE", () => {
  it("a range of numbers", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "4");
    sh.set("A3", "6");
    sh.set("B1", "=AVERAGE(A1:A3)");
    expect(sh.get("B1")).toBe(4);
  });

  it("booleans in a range", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "FALSE");
    sh.set("A3", "4");
    sh.set("B1", "=AVERAGE(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "");
    sh.set("A3", "4");
    sh.set("B1", "=AVERAGE(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("an error in the range", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=AVERAGE(A1:A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=AVERAGE()");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=AVERAGE(A1:A3)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });
});

describe("MIN", () => {
  it("a range of numbers", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("A2", "1");
    sh.set("A3", "3");
    sh.set("B1", "=MIN(A1:A3)");
    expect(sh.get("B1")).toBe(1);
  });

  it("negative numbers", () => {
    const sh = s();
    sh.set("A1", "-5");
    sh.set("A2", "-1");
    sh.set("B1", "=MIN(A1:A2)");
    expect(sh.get("B1")).toBe(-5);
  });

  it("numeric-looking text in a range", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("A2", '=CONCAT("1")');
    sh.set("B1", "=MIN(A1:A2)");
    sh.set("B2", '=A1+"1"');
    expect(sh.get("B1")).toBe(5);
    expect(sh.get("B2")).toBe(6);
  });

  it("booleans in a range", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("A2", "FALSE");
    sh.set("B1", "=MIN(A1:A2)");
    expect(sh.get("B1")).toBe(5);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("A2", "5");
    sh.set("B1", "=MIN(A1:A2)");
    expect(sh.get("B1")).toBe(5);
  });

  it("an error in the range", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=MIN(A1:A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=MIN()");
    expect(sh.get("B1")).toBe(0);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=MIN(A1:A3)");
    expect(sh.get("B1")).toBe(0);
  });
});

describe("MAX", () => {
  it("a range of numbers", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("A2", "1");
    sh.set("A3", "3");
    sh.set("B1", "=MAX(A1:A3)");
    expect(sh.get("B1")).toBe(5);
  });

  it("negative numbers", () => {
    const sh = s();
    sh.set("A1", "-5");
    sh.set("A2", "-1");
    sh.set("B1", "=MAX(A1:A2)");
    expect(sh.get("B1")).toBe(-1);
  });

  it("numeric-looking text in a range", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("A2", '=CONCAT("10")');
    sh.set("B1", "=MAX(A1:A2)");
    sh.set("B2", '=A1+"10"');
    expect(sh.get("B1")).toBe(5);
    expect(sh.get("B2")).toBe(15);
  });

  it("booleans in a range", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("A2", "TRUE");
    sh.set("B1", "=MAX(A1:A2)");
    expect(sh.get("B1")).toBe(5);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "");
    sh.set("A2", "5");
    sh.set("B1", "=MAX(A1:A2)");
    expect(sh.get("B1")).toBe(5);
  });

  it("an error in the range", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=MAX(A1:A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=MAX()");
    expect(sh.get("B1")).toBe(0);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=MAX(A1:A3)");
    expect(sh.get("B1")).toBe(0);
  });
});

describe("COUNT", () => {
  it("a range of numbers", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("A3", "3");
    sh.set("B1", "=COUNT(A1:A3)");
    expect(sh.get("B1")).toBe(3);
  });

  it("numeric-looking text in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", '=CONCAT("7")');
    sh.set("B1", "=COUNT(A1:A2)");
    expect(sh.get("B1")).toBe(1);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "");
    sh.set("B1", "=COUNT(A1:A2)");
    expect(sh.get("B1")).toBe(1);
  });

  it("an error in the range", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=COUNT(A1:A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=COUNT()");
    expect(sh.get("B1")).toBe(0);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=COUNT(A1:A3)");
    expect(sh.get("B1")).toBe(0);
  });

  it("mixed scalar and range arguments", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=COUNT(A1:A2,99)");
    expect(sh.get("B1")).toBe(3);
  });
});

describe("COUNTA", () => {
  it("numeric cells", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=COUNTA(A1:A2)");
    expect(sh.get("B1")).toBe(2);
  });

  it("text in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "hello");
    sh.set("B1", "=COUNTA(A1:A2)");
    sh.set("B2", "=COUNT(A1:A2)");
    expect(sh.get("B1")).toBe(2);
    expect(sh.get("B2")).toBe(1);
  });

  it("booleans in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "TRUE");
    sh.set("B1", "=COUNTA(A1:A2)");
    expect(sh.get("B1")).toBe(2);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "");
    sh.set("B1", "=COUNTA(A1:A2)");
    expect(sh.get("B1")).toBe(1);
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=COUNTA()");
    expect(sh.get("B1")).toBe(0);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=COUNTA(A1:A3)");
    expect(sh.get("B1")).toBe(0);
  });

  it("an error value in the range", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("A2", "5");
    sh.set("B1", "=COUNTA(A1:A2)");
    expect(sh.get("B1")).toBe(2);
  });
});

describe("PRODUCT", () => {
  it("a range of numbers", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "3");
    sh.set("A3", "4");
    sh.set("B1", "=PRODUCT(A1:A3)");
    expect(sh.get("B1")).toBe(24);
  });

  it("a negative factor", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "-3");
    sh.set("B1", "=PRODUCT(A1:A2)");
    expect(sh.get("B1")).toBe(-6);
  });

  it("numeric-looking text in a range", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", '=CONCAT("3")');
    sh.set("B1", "=PRODUCT(A1:A2)");
    sh.set("B2", '=A1*"3"');
    expect(sh.get("B1")).toBe(2);
    expect(sh.get("B2")).toBe(6);
  });

  it("booleans in a range", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "TRUE");
    sh.set("A3", "3");
    sh.set("B1", "=PRODUCT(A1:A3)");
    expect(sh.get("B1")).toBe(6);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "2");
    sh.set("A2", "");
    sh.set("A3", "3");
    sh.set("B1", "=PRODUCT(A1:A3)");
    expect(sh.get("B1")).toBe(6);
  });

  it("an error in the range", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "=PRODUCT(A1:A1)");
    expect(sh.get("B1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("B1", "=PRODUCT()");
    expect(sh.get("B1")).toBe(0);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=PRODUCT(A1:A3)");
    expect(sh.get("B1")).toBe(0);
  });
});
