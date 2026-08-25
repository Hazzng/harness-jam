import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("VLOOKUP", () => {
  it("a case-different match", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("A2", "pear");
    sh.set("B2", "20");
    sh.set("C1", '=VLOOKUP("PEAR",A1:B2,2)');
    expect(sh.get("C1")).toBe(20);
  });

  it("no matching key", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("C1", '=VLOOKUP("plum",A1:B1,2)');
    expect(sh.get("C1")).toEqual({ err: "#N/A" });
  });

  it("colIndex of 1", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("C1", '=VLOOKUP("apple",A1:B1,1)');
    expect(sh.get("C1")).toBe("apple");
  });

  it("a colIndex below 1", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("C1", '=VLOOKUP("apple",A1:B1,0)');
    expect(sh.get("C1")).toEqual({ err: "#VALUE!" });
  });

  it("a numeric key", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "one");
    sh.set("A2", "2");
    sh.set("B2", "two");
    sh.set("C1", "=VLOOKUP(2,A1:B2,2)");
    expect(sh.get("C1")).toBe("two");
  });

  it("duplicate keys", () => {
    const sh = s();
    sh.set("A1", "dup");
    sh.set("B1", "1");
    sh.set("A2", "dup");
    sh.set("B2", "2");
    sh.set("C1", '=VLOOKUP("dup",A1:B2,2)');
    expect(sh.get("C1")).toBe(1);
  });

  it("a scalar table argument", () => {
    const sh = s();
    sh.set("C1", '=VLOOKUP("x",5,1)');
    expect(sh.get("C1")).toEqual({ err: "#VALUE!" });
  });

  it("an error before the match", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    sh.set("B1", "10");
    sh.set("A2", "pear");
    sh.set("B2", "20");
    sh.set("C1", '=VLOOKUP("pear",A1:B2,2)');
    expect(sh.get("C1")).toEqual({ err: "#DIV/0!" });
  });

  it("approximate mode, a key between rows", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "one");
    sh.set("A2", "5");
    sh.set("B2", "five");
    sh.set("A3", "10");
    sh.set("B3", "ten");
    sh.set("C1", "=VLOOKUP(7,A1:B3,2,FALSE)");
    expect(sh.get("C1")).toBe("five");
  });

  it("approximate mode, a key below every entry", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "one");
    sh.set("A2", "5");
    sh.set("B2", "five");
    sh.set("C1", "=VLOOKUP(0,A1:B2,2,FALSE)");
    expect(sh.get("C1")).toEqual({ err: "#N/A" });
  });

  it("an explicit exact flag", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("C1", '=VLOOKUP("APPLE",A1:B1,2,TRUE)');
    expect(sh.get("C1")).toBe(10);
  });

  it("too few arguments", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("C1", '=VLOOKUP("apple",A1:B1)');
    expect(sh.get("C1")).toEqual({ err: "#VALUE!" });
  });

  it("too many arguments", () => {
    const sh = s();
    sh.set("A1", "apple");
    sh.set("B1", "10");
    sh.set("C1", '=VLOOKUP("apple",A1:B1,2,TRUE,1)');
    expect(sh.get("C1")).toEqual({ err: "#VALUE!" });
  });
});
