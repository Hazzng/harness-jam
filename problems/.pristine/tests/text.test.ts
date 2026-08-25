import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("CONCAT", () => {
  it("several scalar arguments", () => {
    const sh = s();
    sh.set("A1", '=CONCAT("foo","bar")');
    expect(sh.get("A1")).toBe("foobar");
  });

  it("a numeric argument", () => {
    const sh = s();
    sh.set("A1", "-2.5");
    sh.set("B1", "=CONCAT(A1)");
    expect(sh.get("B1")).toBe("-2.5");
  });

  it("a boolean argument", () => {
    const sh = s();
    sh.set("A1", "=CONCAT(TRUE,FALSE)");
    expect(sh.get("A1")).toBe("TRUEFALSE");
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", '=CONCAT("a",B1,"b")');
    expect(sh.get("A1")).toBe("ab");
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "a");
    sh.set("A2", "b");
    sh.set("A3", "c");
    sh.set("B1", "=CONCAT(A1:A3)");
    expect(sh.get("B1")).toBe("abc");
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", '=CONCAT(1/0,"x")');
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("no arguments", () => {
    const sh = s();
    sh.set("A1", "=CONCAT()");
    expect(sh.get("A1")).toBe("");
  });

  it("mixed scalar and range arguments", () => {
    const sh = s();
    sh.set("A1", "x");
    sh.set("A2", "y");
    sh.set("B1", '=CONCAT("[",A1:A2,"]")');
    expect(sh.get("B1")).toBe("[xy]");
  });

  it("spaces around a word", () => {
    const sh = s();
    sh.set("A1", '=CONCAT("  hi  ")');
    expect(sh.get("A1")).toBe("  hi  ");
  });
});

describe("LEN", () => {
  it("plain text", () => {
    const sh = s();
    sh.set("A1", '=LEN("hello")');
    expect(sh.get("A1")).toBe(5);
  });

  it("a numeric argument", () => {
    const sh = s();
    sh.set("A1", "=LEN(123)");
    expect(sh.get("A1")).toBe(3);
  });

  it("a boolean argument", () => {
    const sh = s();
    sh.set("A1", "=LEN(TRUE)");
    sh.set("A2", "=LEN(FALSE)");
    expect(sh.get("A1")).toBe(4);
    expect(sh.get("A2")).toBe(5);
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "=LEN(B1)");
    expect(sh.get("A1")).toBe(0);
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=LEN(1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too few arguments", () => {
    const sh = s();
    sh.set("A1", "=LEN()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=LEN("a","b")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "x");
    sh.set("A2", "y");
    sh.set("B1", "=LEN(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});

describe("TRIM", () => {
  it("an interior double space", () => {
    const sh = s();
    sh.set("A1", "=TRIM(\"a  b\")");
    expect(sh.get("A1")).toBe("a  b");
  });

  it("surrounding spaces", () => {
    const sh = s();
    sh.set("A1", '=TRIM("  hi  ")');
    expect(sh.get("A1")).toBe("hi");
  });

  it("text with no extra spaces", () => {
    const sh = s();
    sh.set("A1", '=TRIM("clean")');
    expect(sh.get("A1")).toBe("clean");
  });

  it("an all-spaces argument", () => {
    const sh = s();
    sh.set("A1", '=TRIM("   ")');
    expect(sh.get("A1")).toBe("");
  });

  it("a numeric argument", () => {
    const sh = s();
    sh.set("A1", "=TRIM(42)");
    expect(sh.get("A1")).toBe("42");
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=TRIM(1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too few arguments", () => {
    const sh = s();
    sh.set("A1", "=TRIM()");
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=TRIM("a","b")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "x");
    sh.set("A2", "y");
    sh.set("B1", "=TRIM(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});

describe("UPPER", () => {
  it("lowercase text", () => {
    const sh = s();
    sh.set("A1", '=UPPER("hello")');
    expect(sh.get("A1")).toBe("HELLO");
  });

  it("mixed-case text", () => {
    const sh = s();
    sh.set("A1", '=UPPER("HeLLo")');
    expect(sh.get("A1")).toBe("HELLO");
  });

  it("a numeric argument", () => {
    const sh = s();
    sh.set("A1", "=UPPER(123)");
    expect(sh.get("A1")).toBe("123");
  });

  it("a boolean argument", () => {
    const sh = s();
    sh.set("A1", "=UPPER(TRUE)");
    expect(sh.get("A1")).toBe("TRUE");
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "=UPPER(B1)");
    expect(sh.get("A1")).toBe("");
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=UPPER(1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=UPPER("a","b")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "x");
    sh.set("A2", "y");
    sh.set("B1", "=UPPER(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});

describe("LOWER", () => {
  it("uppercase text", () => {
    const sh = s();
    sh.set("A1", '=LOWER("HELLO")');
    expect(sh.get("A1")).toBe("hello");
  });

  it("mixed-case text", () => {
    const sh = s();
    sh.set("A1", '=LOWER("HeLLo")');
    expect(sh.get("A1")).toBe("hello");
  });

  it("a numeric argument", () => {
    const sh = s();
    sh.set("A1", "=LOWER(123)");
    expect(sh.get("A1")).toBe("123");
  });

  it("a boolean argument", () => {
    const sh = s();
    sh.set("A1", "=LOWER(TRUE)");
    expect(sh.get("A1")).toBe("true");
  });

  it("an empty argument", () => {
    const sh = s();
    sh.set("A1", "=LOWER(B1)");
    expect(sh.get("A1")).toBe("");
  });

  it("an error argument", () => {
    const sh = s();
    sh.set("A1", "=LOWER(1/0)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=LOWER("A","B")');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a range argument", () => {
    const sh = s();
    sh.set("A1", "x");
    sh.set("A2", "y");
    sh.set("B1", "=LOWER(A1:A2)");
    expect(sh.get("B1")).toEqual({ err: "#VALUE!" });
  });
});

describe("LEFT", () => {
  it("no count argument", () => {
    const sh = s();
    sh.set("A1", "=LEFT(\"hello\")");
    expect(sh.get("A1")).toBe("");
  });

  it("an omitted count", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello")');
    expect(sh.get("A1")).toBe("h");
  });

  it("a count within the length", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",3)');
    expect(sh.get("A1")).toBe("hel");
  });

  it("a count beyond the length", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hi",10)');
    expect(sh.get("A1")).toBe("hi");
  });

  it("a count of zero", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",0)');
    expect(sh.get("A1")).toBe("");
  });

  it("a negative count", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",-1)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a fractional count", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",2.9)');
    expect(sh.get("A1")).toBe("he");
  });

  it("a non-text first argument", () => {
    const sh = s();
    sh.set("A1", "=LEFT(1234,2)");
    expect(sh.get("A1")).toBe("12");
  });

  it("a boolean count argument", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",TRUE)');
    expect(sh.get("A1")).toBe("h");
  });

  it("an error in the text argument", () => {
    const sh = s();
    sh.set("A1", "=LEFT(1/0,1)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("an error in the count argument", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",1/0)');
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=LEFT("hello",1,2)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});

describe("RIGHT", () => {
  it("an omitted count", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello")');
    expect(sh.get("A1")).toBe("o");
  });

  it("a count within the length", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",3)');
    expect(sh.get("A1")).toBe("llo");
  });

  it("a count beyond the length", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hi",10)');
    expect(sh.get("A1")).toBe("hi");
  });

  it("a count one past the length", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",6)');
    expect(sh.get("A1")).toBe("hello");
  });

  it("a count of zero", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",0)');
    expect(sh.get("A1")).toBe("");
  });

  it("a negative count", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",-1)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });

  it("a fractional count", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",2.1)');
    expect(sh.get("A1")).toBe("lo");
  });

  it("a small negative fractional count", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",-0.5)');
    expect(sh.get("A1")).toBe("");
  });

  it("a non-text first argument", () => {
    const sh = s();
    sh.set("A1", "=RIGHT(1234,2)");
    expect(sh.get("A1")).toBe("34");
  });

  it("a boolean count argument", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",TRUE)');
    expect(sh.get("A1")).toBe("o");
  });

  it("an error in the text argument", () => {
    const sh = s();
    sh.set("A1", "=RIGHT(1/0,1)");
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("an error in the count argument", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",1/0)');
    expect(sh.get("A1")).toEqual({ err: "#DIV/0!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", '=RIGHT("hello",1,2)');
    expect(sh.get("A1")).toEqual({ err: "#VALUE!" });
  });
});
