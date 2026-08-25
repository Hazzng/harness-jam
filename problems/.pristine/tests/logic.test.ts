import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("IF", () => {
  it("a true condition", () => {
    const sh = s();
    sh.set("A1", "=IF(TRUE,1,2)");
    expect(sh.get("A1")).toBe(1);
  });

  it("a false condition", () => {
    const sh = s();
    sh.set("A1", "=IF(FALSE,1,2)");
    expect(sh.get("A1")).toBe(2);
  });

  it("an omitted third argument", () => {
    const sh = s();
    sh.set("A1", "=IF(FALSE,1)");
    expect(sh.get("A1")).toBe(false);
  });

  it("a nonzero numeric condition", () => {
    const sh = s();
    sh.set("A1", "=IF(5,1,2)");
    expect(sh.get("A1")).toBe(1);
  });

  it("a zero numeric condition", () => {
    const sh = s();
    sh.set("A1", "=IF(0,1,2)");
    expect(sh.get("A1")).toBe(2);
  });

  it("a mixed-case text condition", () => {
    const sh = s();
    sh.set("A1", '=IF("true",1,2)');
    sh.set("A2", '=IF("FaLsE",1,2)');
    expect(sh.get("A1")).toBe(1);
    expect(sh.get("A2")).toBe(2);
  });

  it("non-boolean text as a condition", () => {
    const sh = s();
    sh.set("A1", '=IF("hello",1,2)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an error as the condition", () => {
    const sh = s();
    sh.set("A1", "=IF(1/0,1,2)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("an error in the untaken branch", () => {
    const sh = s();
    sh.set("A1", "=IF(TRUE,1,1/0)");
    sh.set("A2", "=IF(FALSE,1/0,2)");
    expect(sh.get("A1")).toBe(1);
    expect(sh.get("A2")).toBe(2);
  });

  it("too few arguments", () => {
    const sh = s();
    sh.set("A1", "=IF(TRUE)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", "=IF(TRUE,1,2,3)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range as the condition", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=IF(A1:A2,1,2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});

describe("AND", () => {
  it("an empty argument list", () => {
    const sh = s();
    sh.set("A1", "=AND()");
    expect(sh.get("A1")).toBe(true);
  });

  it("all truthy arguments", () => {
    const sh = s();
    sh.set("A1", "=AND(TRUE,TRUE,1)");
    expect(sh.get("A1")).toBe(true);
  });

  it("one falsy argument", () => {
    const sh = s();
    sh.set("A1", "=AND(TRUE,FALSE,TRUE)");
    expect(sh.get("A1")).toBe(false);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "TRUE");
    sh.set("A3", "TRUE");
    sh.set("B1", "=AND(A1:A3)");
    expect(sh.get("B1")).toBe(true);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=AND(A1:A3)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("A1", "=AND()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=AND(1/0,TRUE)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("numeric arguments", () => {
    const sh = s();
    sh.set("A1", "=AND(3,TRUE)");
    sh.set("A2", "=AND(0,TRUE)");
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
  });

  it("mixed-case text arguments", () => {
    const sh = s();
    sh.set("A1", '=AND("true","TRUE")');
    sh.set("A2", '=AND("true","false")');
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
  });

  it("an unrecognized argument value", () => {
    const sh = s();
    sh.set("A1", '=AND("hello")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("mixed scalar and range arguments", () => {
    const sh = s();
    sh.set("A1", "TRUE");
    sh.set("A2", "TRUE");
    sh.set("B1", "=AND(A1:A2,TRUE)");
    expect(sh.get("B1")).toBe(true);
  });
});

describe("OR", () => {
  it("one truthy argument", () => {
    const sh = s();
    sh.set("A1", "=OR(FALSE,FALSE,1)");
    expect(sh.get("A1")).toBe(true);
  });

  it("all falsy arguments", () => {
    const sh = s();
    sh.set("A1", "=OR(FALSE,0,FALSE)");
    expect(sh.get("A1")).toBe(false);
  });

  it("empty cells in a range", () => {
    const sh = s();
    sh.set("A1", "FALSE");
    sh.set("A3", "FALSE");
    sh.set("B1", "=OR(A1:A3)");
    expect(sh.get("B1")).toBe(false);
  });

  it("an all-empty range", () => {
    const sh = s();
    sh.set("B1", "=OR(A1:A3)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("A1", "=OR()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=OR(1/0,FALSE)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("an error after a truthy argument", () => {
    const sh = s();
    sh.set("A1", "=OR(TRUE,1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("numeric arguments", () => {
    const sh = s();
    sh.set("A1", "=OR(3,FALSE)");
    sh.set("A2", "=OR(0,FALSE)");
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
  });

  it("mixed-case text arguments", () => {
    const sh = s();
    sh.set("A1", '=OR("false","TRUE")');
    sh.set("A2", '=OR("false","FALSE")');
    expect(sh.get("A1")).toBe(true);
    expect(sh.get("A2")).toBe(false);
  });

  it("an unrecognized argument value", () => {
    const sh = s();
    sh.set("A1", '=OR("hello")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("mixed scalar and range arguments", () => {
    const sh = s();
    sh.set("A1", "FALSE");
    sh.set("A2", "FALSE");
    sh.set("B1", "=OR(A1:A2,TRUE)");
    expect(sh.get("B1")).toBe(true);
  });
});

describe("NOT", () => {
  it("a true argument", () => {
    const sh = s();
    sh.set("A1", "=NOT(TRUE)");
    expect(sh.get("A1")).toBe(false);
  });

  it("a false argument", () => {
    const sh = s();
    sh.set("A1", "=NOT(FALSE)");
    expect(sh.get("A1")).toBe(true);
  });

  it("a nonzero numeric argument", () => {
    const sh = s();
    sh.set("A1", "=NOT(5)");
    expect(sh.get("A1")).toBe(false);
  });

  it("an unrecognized argument value", () => {
    const sh = s();
    sh.set("A1", '=NOT("hello")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=NOT(1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too few arguments", () => {
    const sh = s();
    sh.set("A1", "=NOT()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", "=NOT(TRUE,FALSE)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "TRUE");
    sh.set("A2", "FALSE");
    sh.set("B1", "=NOT(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});

describe("IFERROR", () => {
  it("a non-error value", () => {
    const sh = s();
    sh.set("A1", '=IFERROR(5,"fallback")');
    expect(sh.get("A1")).toBe(5);
  });

  it("an error first argument", () => {
    const sh = s();
    sh.set("A1", '=IFERROR(1/0,"fallback")');
    expect(sh.get("A1")).toBe("fallback");
  });

  it("part of a larger expression", () => {
    const sh = s();
    sh.set("A1", "=IFERROR(1/0,5)+1");
    expect(sh.get("A1")).toBe(6);
  });

  it("an error fallback", () => {
    const sh = s();
    sh.set("A1", "=IFERROR(1/0,1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("an unknown function name", () => {
    const sh = s();
    sh.set("A1", '=IFERROR(NOPE(1),"fallback")');
    expect(sh.get("A1")).toBe("fallback");
  });

  it("an out-of-bounds reference", () => {
    const sh = s();
    sh.set("A1", '=IFERROR(ZZZ1000000,"fallback")');
    expect(sh.get("A1")).toBe("fallback");
  });

  it("an empty first argument", () => {
    const sh = s();
    sh.set("A1", '=IFERROR(B1,"fallback")');
    expect(sh.get("A1")).toBe(null);
  });

  it("too few arguments", () => {
    const sh = s();
    sh.set("A1", "=IFERROR(5)");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=IFERROR(5,"a","b")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range as the first argument", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", '=IFERROR(A1:A2,"fallback")');
    expect(sh.get("B1")).toBe("fallback");
  });
});
