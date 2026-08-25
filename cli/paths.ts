import { join } from "node:path";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
export const PROBLEM = join(ROOT, "problems", "minicalc");
/** Byte-identical copy of the shipped tests. Restored before scoring. */
export const PRISTINE_TESTS = join(ROOT, "problems", ".pristine", "tests");
/** Sibling assertions. Absent from the public repo; supplied on the day. */
export const HIDDEN_TESTS = join(ROOT, "problems", ".hidden");
export const RUNS = join(ROOT, "runs");

export function runDir(id: string): string {
  return join(RUNS, id);
}
