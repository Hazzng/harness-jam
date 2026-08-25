// ─────────────────────────────────────────────────────────────────────────
//  THIS FILE IS YOURS. Rewrite it.
//
//  A working harness. Run it, read the trace, and make it better.
//
//  Everything under base/ is plumbing. model.ts, trace.ts, report.ts and
//  config.ts are fixed — they are what make two runs comparable. The rest is
//  fair game.
// ─────────────────────────────────────────────────────────────────────────

import { call, usage, type Item } from "../base/model.js";
import { openReport, record } from "../base/report.js";
import { runSuite, type TestOutcome } from "../base/suite.js";
import { dispatch, toolSpecs } from "../base/tools/index.js";
import { elapsedMs, emit, openTrace } from "../base/trace.js";

const MAX_TURNS = 6;

function flag(name: string, fallback = ""): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

const SYSTEM = `I have some code that is broken and I really need your help fixing it. Please
be as thorough and careful as you possibly can — take your time and think very
deeply about the problem before answering. Quality matters a lot to me here.

Please explain your reasoning clearly and in detail so that I can follow along,
and make sure your explanation is well structured and easy to read. Feel free
to ask me any clarifying questions if anything is unclear or if you need more
information about the codebase.

Thank you so much, I really appreciate your help!`;

interface Group {
  /** Stable id used everywhere in the trace, e.g. "tests/agg.test.ts". */
  id: string;
  /** The file its failures live in, e.g. "agg.test.ts". */
  file: string;
  tests: TestOutcome[];
}

async function attempt(workspace: string, group: Group): Promise<void> {
  const listed = group.tests.map((t) => `  ${t.name}`).join("\n");
  const input: Item[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `These tests are failing in tests/${group.file}:\n\n${listed}\n\nFix them.`,
    },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await call(input, toolSpecs(), { task: group.id });

    if (res.toolCalls.length === 0) {
      emit({
        type: "note",
        task: group.id,
        summary: `the model stopped calling tools after ${turn + 1} turns`,
      });
      return;
    }

    // Append the model's own items verbatim — that is what carries reasoning
    // state into the next turn — then answer each call.
    input.push(...res.output);
    for (const t of res.toolCalls) {
      const out = await dispatch(t, { workspace, task: group.id });
      input.push({ type: "function_call_output", call_id: t.call_id, output: out });
    }
  }

  emit({
    type: "note",
    task: group.id,
    summary: `gave up: hit the ${MAX_TURNS} turn limit`,
  });
}

// `jam run` sends SIGTERM on Ctrl-C and keeps polling the trace for
// `run_end` to know the harness is actually done. Without this, a run killed
// before it wrote one leaves `jam watch` guessing from a stale mtime for up
// to 90s. openTrace() may not have run yet (Ctrl-C during startup) — emit()
// throws in that case, so swallow it and just exit.
let traceOpen = false;
function onKilled(signal: string): void {
  try {
    if (traceOpen) emit({ type: "run_end", summary: `interrupted (${signal})` });
  } catch {
    // openTrace() never ran — nothing to close.
  }
  process.exit(130);
}
process.on("SIGINT", () => onKilled("SIGINT"));
process.on("SIGTERM", () => onKilled("SIGTERM"));

async function main(): Promise<void> {
  const workspace = flag("workspace");
  const runId = flag("run", `r${Date.now()}`);
  if (!workspace) throw new Error("--workspace is required");

  openTrace(runId, flag("trace", `runs/${runId}/trace.jsonl`));
  traceOpen = true;
  openReport(flag("report", `runs/${runId}/report.json`));
  emit({ type: "run_start", summary: workspace });

  const only = flag("only");
  const cap = Number(flag("n", "0"));
  const first = await runSuite(workspace);
  // What is red right now, so a task can report the neighbours it also fixed.
  const red = new Set(first.filter((t) => !t.ok).map((t) => t.name));

  let failing = first.filter((t) => !t.ok);
  if (only) failing = failing.filter((t) => t.name.includes(only));

  // One task per test file.
  const byFile = new Map<string, TestOutcome[]>();
  for (const t of failing) {
    const g = byFile.get(t.file);
    if (g) g.push(t);
    else byFile.set(t.file, [t]);
  }
  let groups: Group[] = [...byFile].map(([file, tests]) => ({
    id: `tests/${file}`,
    file,
    tests,
  }));
  if (cap > 0) groups = groups.slice(0, cap);

  emit({
    type: "note",
    summary:
      `${red.size} failing of ${first.length} in ${byFile.size} file(s)` +
      (groups.length === byFile.size ? "" : `, attempting ${groups.length}`),
  });

  // One task per failing test, in the order vitest happened to report them.
  // Nothing here groups related failures, and nothing runs in parallel.
  for (const group of groups) {
    const named = group.tests.slice(0, 5).map((t) => t.name);
    emit({
      type: "task_start",
      task: group.id,
      summary:
        `${group.tests.length} failing\n` +
        named.map((n) => `· ${n}`).join("\n") +
        (group.tests.length > named.length
          ? `\n· … and ${group.tests.length - named.length} more`
          : ""),
    });
    await attempt(workspace, group);

    const after = await runSuite(workspace);
    const stillRed = new Set(after.filter((t) => !t.ok).map((t) => t.name));
    const mine = group.tests.filter((t) => stillRed.has(t.name)).length;

    const own = new Set(group.tests.map((t) => t.name));
    let alsoFixed = 0;
    for (const name of red) if (!own.has(name) && !stillRed.has(name)) alsoFixed++;
    for (const name of stillRed) red.add(name);
    for (const name of [...red]) if (!stillRed.has(name)) red.delete(name);

    record({
      id: group.id,
      tests: group.tests.map((t) => t.name),
      status: mine > 0 ? "gave_up" : "fixed",
      ...(mine > 0 ? { reason: `${mine} of this file's tests still fail` } : {}),
    });
    const remaining = stillRed.size;
    emit({
      type: "task_end",
      task: group.id,
      summary:
        remaining === 0
          ? `all ${after.length} tests in the suite pass`
          : (mine > 0
              ? `${mine} of this file's tests still fail`
              : `fixed this file${
                  alsoFixed > 0 ? ` and ${alsoFixed} test${alsoFixed === 1 ? "" : "s"} elsewhere` : ""
                }`) + ` · ${remaining} of ${after.length} still failing`,
    });
  }

  emit({
    type: "run_end",
    summary:
      `${usage.out().toLocaleString("en-US")} tokens out, ` +
      `${usage.in().toLocaleString("en-US")} in, ` +
      `${Math.round(elapsedMs() / 1000)}s`,
  });
}

main().catch((e: unknown) => {
  emit({ type: "run_end", summary: `crashed: ${String(e)}` });
  console.error(e);
  process.exit(1);
});
