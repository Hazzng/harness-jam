// ─────────────────────────────────────────────────────────────────────────
//  FIXED FILE — do not edit.
//
//  How you tell the scorer what happened. Every call writes to disk
//  immediately, so an interrupted run keeps its results — anything you were
//  still holding in memory when it stopped would be lost.
//
//  Your score comes from the test suite, never from this file. What this file
//  decides is credit for the work the suite CANNOT see — a test that is
//  itself wrong, or a task you correctly judged not worth more budget.
// ─────────────────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type TaskStatus =
  /** You believe the code is now correct. */
  | "fixed"
  /** The test is wrong: it asserts something the spec forbids. Give a reason
   *  naming the test and the spec section it contradicts. */
  | "test_is_wrong"
  /** Real, but you chose to stop spending on it. Say why. */
  | "gave_up";

export interface TaskReport {
  id: string;
  /** Full vitest test names this task was about. */
  tests: string[];
  status: TaskStatus;
  /** Required for `test_is_wrong` and `gave_up`. Prose, for a human. */
  reason?: string;
}

let path = "";
const tasks: TaskReport[] = [];

export function openReport(file: string): void {
  path = file;
  mkdirSync(dirname(file), { recursive: true });
  flush();
}

/** Records one task and writes the whole report. Safe to call repeatedly. */
export function record(t: TaskReport): void {
  if (!path) throw new Error("openReport() was never called");
  const i = tasks.findIndex((x) => x.id === t.id);
  if (i === -1) tasks.push(t);
  else tasks[i] = t;
  flush();
}

function flush(): void {
  writeFileSync(path, JSON.stringify({ tasks }, null, 2) + "\n");
}
