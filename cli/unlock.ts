import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { HIDDEN_TESTS } from "./paths.js";
import { bold, dim, green } from "./render.js";

/**
 * Installs the hidden assertions handed out at the end, then scores the run
 * you already have. It does not re-run your harness — the point is to find out
 * what the run you already produced was really worth.
 */
export function cmdUnlock(file: string): void {
  const src = resolve(file);
  if (!existsSync(src)) throw new Error(`no such file: ${src}`);

  rmSync(HIDDEN_TESTS, { recursive: true, force: true });
  mkdirSync(HIDDEN_TESTS, { recursive: true });
  execFileSync("tar", ["-xzf", src, "-C", HIDDEN_TESTS]);

  const n = readdirSync(HIDDEN_TESTS).filter((f) => f.endsWith(".test.ts")).length;
  console.log(`\n  ${green("unlocked")}  ${bold(String(n))} hidden test files`);
  console.log(`  ${dim("These were never in your repo. They are the assertions your fixes")}`);
  console.log(`  ${dim("were actually measured against.")}\n`);
  console.log(`  ${dim("jam score")}          score the run you already have`);
  console.log(`  ${dim("jam score <run>")}    score a specific one\n`);
}
