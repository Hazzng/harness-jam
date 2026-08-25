import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("recalc: dirty propagation through transitive dependents (§6)", () => {
  it("a multi-level chain", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("A2", "=A1+1");
    sh.set("A3", "=A2*10");
    sh.set("A4", "=A3-5");
    expect(sh.get("A4")).toBe(15);
    sh.set("A1", "5");
    expect(sh.get("A4")).toBe(55);
  });

  it("a diamond-shaped graph", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "=A1+1");
    sh.set("C1", "=A1+2");
    sh.set("D1", "=B1+C1");
    expect(sh.get("D1")).toBe(5); // 2 + 3
    sh.set("A1", "10");
    expect(sh.get("D1")).toBe(23); // 11 + 12
  });

  it("a shared dependency", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "=A1*10");
    sh.set("C1", "=A1*100");
    expect(sh.get("B1")).toBe(10);
    expect(sh.get("C1")).toBe(100);
    sh.set("A1", "2");
    expect(sh.get("B1")).toBe(20);
    expect(sh.get("C1")).toBe(200);
  });

  it("an unrelated cell", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "=A1+1");
    sh.set("C1", "100"); // independent of A1
    expect(sh.get("B1")).toBe(2);
    expect(sh.get("C1")).toBe(100);
    sh.set("A1", "9");
    expect(sh.get("C1")).toBe(100);
    expect(sh.get("B1")).toBe(10);
  });
});

describe("recalc: caching", () => {
  it("repeated reads with no writes", () => {
    const sh = s();
    sh.set("A1", "3");
    sh.set("B1", "=A1*A1");
    expect(sh.get("B1")).toBe(9);
    expect(sh.get("B1")).toBe(9);
    expect(sh.get("B1")).toBe(9);
  });

  it("a write to an unrelated cell", () => {
    const sh = s();
    sh.set("A1", "3");
    sh.set("B1", "=A1*A1");
    expect(sh.get("B1")).toBe(9);
    sh.set("Z9", "anything");
    sh.set("Z9", "something else");
    expect(sh.get("B1")).toBe(9);
  });
});

describe("recalc: re-setting to the same text still invalidates (§6)", () => {
  it("a dependent after a no-op re-set", () => {
    const sh = s();
    sh.set("A1", "1");
    sh.set("B1", "=A1+1");
    expect(sh.get("B1")).toBe(2);
    sh.set("A1", "1"); // identical text: no equality short-circuit per spec
    expect(sh.get("B1")).toBe(2);
  });

  it("a no-op re-set with no dependents", () => {
    const sh = s();
    sh.set("A1", "hello");
    expect(sh.get("A1")).toBe("hello");
    sh.set("A1", "hello");
    expect(sh.get("A1")).toBe("hello");
  });
});

describe("recalc: evaluation order independence (§6)", () => {
  it("either read order", () => {
    const build = () => {
      const sh = s();
      sh.set("A1", "2");
      sh.set("B1", "=A1+1");
      sh.set("C1", "=A1+2");
      sh.set("D1", "=B1+C1");
      return sh;
    };

    const direct = build();
    expect(direct.get("D1")).toBe(7);

    const stepwise = build();
    stepwise.get("A1");
    stepwise.get("B1");
    stepwise.get("C1");
    expect(stepwise.get("D1")).toBe(7);
  });

  it("reading only the dependent", () => {
    const sh = s();
    sh.set("A1", "4");
    sh.set("B1", "=A1*2");
    // A1 is never read directly before B1.
    expect(sh.get("B1")).toBe(8);
  });
});

describe("recalc: dependencies reached through a range (§6)", () => {
  it("a range argument", () => {
    const sh = new Sheet();
    sh.set("A1", "1");
    sh.set("A2", "2");
    sh.set("B1", "=SUM(A1:A2)");
    expect(sh.get("B1")).toBe(3);
    sh.set("A1", "10");
    expect(sh.get("B1")).toBe(12);
  });
});
