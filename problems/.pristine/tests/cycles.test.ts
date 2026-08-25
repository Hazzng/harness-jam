import { describe, expect, it } from "vitest";
import { Sheet } from "../src/engine.js";

const s = () => new Sheet();

describe("cycles: participants (§5)", () => {
  it("a mutual cycle", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
    expect(sh.get("B1")).toEqual({ err: "#CYCLE!" });
  });

  it("a self-reference", () => {
    const sh = s();
    sh.set("A1", "=A1");
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
  });

  it("a three-cell ring", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=C1");
    sh.set("C1", "=A1");
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
    expect(sh.get("B1")).toEqual({ err: "#CYCLE!" });
    expect(sh.get("C1")).toEqual({ err: "#CYCLE!" });
  });
});

describe("cycles: dependents of a cycle (§5)", () => {
  it("a direct dependent", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    sh.set("C1", "=A1+1");
    expect(sh.get("C1")).toEqual({ err: "#CYCLE!" });
  });

  it("a multi-hop dependent", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    sh.set("C1", "=A1+1");
    sh.set("D1", "=C1*2");
    expect(sh.get("D1")).toEqual({ err: "#CYCLE!" });
  });

  it("an unrelated cell", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    sh.set("D1", "=5");
    expect(sh.get("D1")).toBe(5);
  });
});

describe("cycles: #CYCLE! is not #REF! (§5)", () => {
  it("a self-cycle vs a bad reference", () => {
    const sh = s();
    sh.set("A1", "=A1");
    sh.set("B1", "=AAA1"); // column beyond ZZ: unresolvable, not a cycle
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
    expect(sh.get("B1")).toEqual({ err: "#REF!" });
    expect(sh.get("A1")).not.toEqual(sh.get("B1"));
  });
});

describe("cycles: detection order-independence (§5)", () => {
  it("reading the dependent first", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    sh.set("C1", "=A1+1");
    // Read the dependent first.
    expect(sh.get("C1")).toEqual({ err: "#CYCLE!" });
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
    expect(sh.get("B1")).toEqual({ err: "#CYCLE!" });
  });

  it("reading an unrelated cell first", () => {
    const sh = s();
    sh.set("D1", "=5");
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    expect(sh.get("D1")).toBe(5);
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
  });
});

describe("cycles: no iterative calculation (§5)", () => {
  it("a converging self-reference", () => {
    const sh = s();
    // Under iterative calculation this would converge to 5; minicalc has none.
    sh.set("A1", "=A1*0+5");
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
  });

  it("breaking the cycle", () => {
    const sh = s();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    expect(sh.get("A1")).toEqual({ err: "#CYCLE!" });
    sh.set("B1", "5");
    expect(sh.get("A1")).toBe(5);
    expect(sh.get("B1")).toBe(5);
  });
});

describe("cycles: dependents are not merely propagated to (§5)", () => {
  it("a cycle dependent inside IFERROR", () => {
    const sh = new Sheet();
    sh.set("A1", "=B1");
    sh.set("B1", "=A1");
    // IFERROR would swallow an error arriving by propagation. It cannot
    // swallow this one: C1 depends on a cycle, so C1 IS #CYCLE! itself.
    sh.set("C1", '=IFERROR(A1,"safe")');
    expect(sh.get("C1")).toEqual({ err: "#CYCLE!" });
  });
});
