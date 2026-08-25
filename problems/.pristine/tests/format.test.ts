import { describe, expect, it } from "vitest";
import { format } from "../src/format.js";
import type { Err } from "../src/values.js";

describe("format: \"0\" (§8)", () => {
  it("a whole number", () => {
    expect(format(3, "0")).toBe("3");
  });

  it("an exact half, either sign", () => {
    expect(format(3.5, "0")).toBe("4");
    expect(format(-3.5, "0")).toBe("-4");
    expect(format(-0.5, "0")).toBe("-1"); // not banker's rounding to "0" or "-0"
  });
});

describe("format: \"0.00\" with any digit count (§8)", () => {
  it("fewer digits than the spec", () => {
    expect(format(3, "0.00")).toBe("3.00");
  });

  it("more digits than the spec", () => {
    expect(format(3.14159, "0.000")).toBe("3.142");
  });
});

describe("format: \"#,##0\" grouping (§8)", () => {
  it("a large number", () => {
    expect(format(1234567, "#,##0")).toBe("1,234,567");
  });

  it("a small number", () => {
    expect(format(999, "#,##0")).toBe("999");
  });

  it("a large negative number", () => {
    expect(format(-1234, "#,##0")).toBe("-1,234");
  });

  it("grouping with decimals", () => {
    expect(format(1234.5, "#,##0.00")).toBe("1,234.50");
  });
});

describe("format: \"0%\" (§8)", () => {
  it("a fractional value", () => {
    expect(format(0.5, "0%")).toBe("50%");
  });

  it("an exact half after scaling", () => {
    expect(format(0.005, "0%")).toBe("1%");
  });
});

describe("format: coercion and errors", () => {
  it("boolean and empty inputs", () => {
    expect(format(true, "0")).toBe("1");
    expect(format(false, "0")).toBe("0");
    expect(format(null, "0")).toBe("0");
  });

  it("non-numeric text", () => {
    expect(format("hello", "0")).toBe("#VALUE!");
  });

  it("an unrecognized format spec", () => {
    expect(format(5, "0.0.0")).toBe("#VALUE!");
  });

  it("error inputs", () => {
    const divZero: Err = { err: "#DIV/0!" };
    const refErr: Err = { err: "#REF!" };
    expect(format(divZero, "0")).toBe("#DIV/0!");
    expect(format(refErr, "0%")).toBe("#REF!");
  });
});
