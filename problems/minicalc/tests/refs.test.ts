import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";
import {
  colToIndex,
  expandRange,
  indexToCol,
  inBounds,
  normalizeRef,
  parseRef,
  rangeShape,
} from "../src/refs.js";

const s = () => new Sheet();

describe("refs: column/index conversion (§2)", () => {
  it("single-letter columns", () => {
    expect(colToIndex("A")).toBe(0);
    expect(colToIndex("Z")).toBe(25);
  });

  it("double-letter columns", () => {
    expect(colToIndex("AA")).toBe(26);
    expect(colToIndex("ZZ")).toBe(701);
  });

  it("a round-trip conversion", () => {
    expect(indexToCol(0)).toBe("A");
    expect(indexToCol(25)).toBe("Z");
    expect(indexToCol(26)).toBe("AA");
    expect(indexToCol(701)).toBe("ZZ");
  });
});

describe("refs: A1 notation and $ prefixes (§2)", () => {
  it("plain A1 notation", () => {
    expect(parseRef("B3")).toEqual({ col: 1, row: 2 });
  });

  it("dollar-sign prefixes", () => {
    const plain = parseRef("B3");
    expect(parseRef("$B3")).toEqual(plain);
    expect(parseRef("B$3")).toEqual(plain);
    expect(parseRef("$B$3")).toEqual(plain);
  });

  it("a dollar-prefixed formula reference", () => {
    const sh = s();
    sh.set("A1", "5");
    sh.set("B1", "=$A$1*2");
    expect(sh.get("B1")).toBe(10);
  });

  it("a non-reference string", () => {
    expect(parseRef("1A")).toBeNull();
    expect(parseRef("A")).toBeNull();
    expect(parseRef("A0")).toBeNull(); // rows start at 1
    expect(parseRef("")).toBeNull();
  });

  it("a lowercase, dollar-prefixed reference", () => {
    expect(normalizeRef("$b$7")).toBe("B7");
    expect(normalizeRef("a1")).toBe("A1");
  });
});

describe("refs: range normalisation (§2)", () => {
  it("a reversed range", () => {
    expect(rangeShape("D5", "B2")).toEqual(rangeShape("B2", "D5"));
  });

  it("a multi-row range", () => {
    expect(expandRange("A1", "B2")).toEqual(["A1", "B1", "A2", "B2"]);
  });
});

describe("refs: out-of-bounds is #REF! (§2)", () => {
  it("the column boundary", () => {
    expect(inBounds(parseRef("ZZ1")!)).toBe(true);
    expect(inBounds(parseRef("AAA1")!)).toBe(false);
  });

  it("the row boundary", () => {
    expect(inBounds(parseRef("A999999")!)).toBe(true);
  });

  it("a single reference past the column limit", () => {
    const sh = s();
    sh.set("A1", "=AAA1");
    expect(sh.get("A1")).toEqual({ err: "#REF!" });
  });

  it("a range with one endpoint out of bounds", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "=SUM(A1:AAA1)");
    expect(sh.get("B1")).toEqual({ err: "#REF!" });
  });

  it("a reference past the row limit", () => {
    const sh = s();
    sh.set("A1", "=A1000000");
    expect(sh.get("A1")).toEqual({ err: "#REF!" });
  });
});
