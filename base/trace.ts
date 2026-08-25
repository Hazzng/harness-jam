// ─────────────────────────────────────────────────────────────────────────
//  FIXED FILE — do not edit.
//
//  Every harness writes the same events, whatever its architecture. That is
//  what lets `jam show` render your agent tree instead of describing it, and
//  what lets your run be compared with everyone else's.
//
//  `agent` and `parent` are here from day one even though the baseline never
//  spawns anything. Build subagents and the tree renders for free.
// ─────────────────────────────────────────────────────────────────────────

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type EventType =
  | "run_start"
  | "run_end"
  | "task_start"
  | "task_end"
  | "agent_start"
  | "agent_end"
  | "model_call"
  | "tool_call"
  | "note";

export interface Event {
  run: string;
  seq: number;
  ms: number;
  type: EventType;
  /** Which unit of work this belongs to, e.g. "bug_07". */
  task?: string;
  /** Which agent emitted it. The root agent is "a0". */
  agent?: string;
  /** The agent that spawned this one. Absent for the root. */
  parent?: string;
  /** Tool or model name. */
  name?: string;
  tokens_in?: number;
  tokens_out?: number;
  /** Short, human-readable. Long payloads belong in `detail`. */
  summary?: string;
  detail?: unknown;

  // ── the narrative ──────────────────────────────────────────────────
  /** What the model actually said this turn. Why it did what it did next. */
  text?: string;
  /** Reasoning summary, when the model returns one. */
  reasoning?: string;
  reasoning_tokens?: number;
  /** Tools it asked for, recorded before any of them ran. */
  calls?: { name: string; args: string }[];
  /** What a tool gave back. Truncated. */
  result?: string;
}

/** Traces are read by humans and by `jam show`. Keep single fields sane. */
export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… ${s.length - max} more characters …`;
}

let runId = "";
let file = "";
let seq = 0;
let t0 = 0;

export function openTrace(id: string, path: string): void {
  runId = id;
  file = path;
  seq = 0;
  t0 = Date.now();
  mkdirSync(dirname(path), { recursive: true });
}

export function emit(e: Omit<Event, "run" | "seq" | "ms">): void {
  if (!file) throw new Error("openTrace() was never called");
  const full: Event = { run: runId, seq: seq++, ms: Date.now() - t0, ...e };
  appendFileSync(file, JSON.stringify(full) + "\n");
}

export function elapsedMs(): number {
  return Date.now() - t0;
}
