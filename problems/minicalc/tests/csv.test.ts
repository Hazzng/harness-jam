import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";
import { fromCSV, toCSV } from "../src/csv.js";

const s = () => new Sheet();

describe("csv: fromCSV fills from A1, row-major, raw text (§7)", () => {
  it("a rectangular block", () => {
    const sh = s();
    fromCSV(sh, "1,2,3\n4,5,6");
    expect(sh.getRaw("A1")).toBe("1");
    expect(sh.getRaw("B1")).toBe("2");
    expect(sh.getRaw("C1")).toBe("3");
    expect(sh.getRaw("A2")).toBe("4");
    expect(sh.getRaw("B2")).toBe("5");
    expect(sh.getRaw("C2")).toBe("6");
  });

  it("a formula-looking field", () => {
    const sh = s();
    fromCSV(sh, "=1+1,plain");
    expect(sh.getRaw("A1")).toBe("=1+1");
    expect(sh.get("A1")).toBe(2); // only evaluated on read, per §1
    expect(sh.get("B1")).toBe("plain");
  });

  it("a quoted comma", () => {
    const sh = s();
    fromCSV(sh, '"a,b",c');
    expect(sh.getRaw("A1")).toBe("a,b");
    expect(sh.getRaw("B1")).toBe("c");
  });

  it("doubled quotes in a field", () => {
    const sh = s();
    fromCSV(sh, '"He said ""hi""",done');
    expect(sh.getRaw("A1")).toBe('He said "hi"');
    expect(sh.getRaw("B1")).toBe("done");
  });

  it("a quoted newline", () => {
    const sh = s();
    fromCSV(sh, '"a\nb",c\nd,e');
    expect(sh.getRaw("A1")).toBe("a\nb");
    expect(sh.getRaw("B1")).toBe("c");
    expect(sh.getRaw("A2")).toBe("d");
    expect(sh.getRaw("B2")).toBe("e");
  });
});

describe("csv: toCSV emits evaluated values (§7)", () => {
  it("a formula cell", () => {
    const sh = s();
    sh.set("A1", "=1+1");
    expect(toCSV(sh, 1, 1)).toBe("2");
  });

  it("an error cell", () => {
    const sh = s();
    sh.set("A1", "=1/0");
    expect(toCSV(sh, 1, 1)).toBe("#DIV/0!");
  });

  it("a field with a comma", () => {
    const sh = s();
    sh.set("A1", "a,b");
    expect(toCSV(sh, 1, 1)).toBe('"a,b"');
  });

  it("a field with a quote", () => {
    const sh = s();
    sh.set("A1", 'say "hi"');
    expect(toCSV(sh, 1, 1)).toBe('"say ""hi"""');
  });

  it("a field with a newline", () => {
    const sh = s();
    sh.set("A1", "line1\nline2");
    expect(toCSV(sh, 1, 1)).toBe('"line1\nline2"');
  });

  it("a plain field", () => {
    const sh = s();
    sh.set("A1", "plain");
    expect(toCSV(sh, 1, 1)).toBe("plain");
  });

  it("a round trip", () => {
    const sh = s();
    fromCSV(sh, '"a,b",2');
    expect(toCSV(sh, 1, 2)).toBe('"a,b",2');
  });
});
