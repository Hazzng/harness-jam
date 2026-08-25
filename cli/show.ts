import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Event } from "../base/trace.js";
import { bold, clock, cyan, dim, green, renderEvent, yellow } from "./render.js";
import { RUNS, runDir } from "./paths.js";
import { Status } from "./status.js";

/**
 * Newest first, by the mtime of the trace — NOT of the run directory. Scoring
 * writes score.json and workspace.diff into the directory, which bumps the
 * directory's mtime, so `jam score <old-run>` would otherwise promote that old
 * run to "latest" and a bare `jam show`/`jam diff` would follow it. The trace
 * is written while the run happens and is never touched again.
 */
function traceMtime(d: string): number {
  try {
    return statSync(join(RUNS, d, "trace.jsonl")).mtimeMs;
  } catch {
    // A run that vanished mid-listing sorts oldest rather than killing the sort.
    return 0;
  }
}

export function listRuns(): string[] {
  if (!existsSync(RUNS)) return [];
  return readdirSync(RUNS)
    .filter((d) => existsSync(join(RUNS, d, "trace.jsonl")))
    .sort((a, b) => traceMtime(b) - traceMtime(a));
}

export function latestRun(): string | undefined {
  return listRuns()[0];
}

function parse(line: string): Event | null {
  try {
    return JSON.parse(line) as Event;
  } catch {
    return null;
  }
}

export function readTrace(id: string): Event[] {
  const f = join(runDir(id), "trace.jsonl");
  if (!existsSync(f)) throw new Error(`no trace for run "${id}"`);
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map(parse).filter((e): e is Event => !!e);
}

/** agent -> parent, so the renderer can indent a spawn tree. */
export function parentMap(events: Event[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of events) if (e.agent && e.parent) m.set(e.agent, e.parent);
  return m;
}

interface ScoreFile {
  testsPassing: number;
  testsTotal: number;
  hiddenApplied: boolean;
  wallSeconds: number;
  tests: { name: string; ok: boolean; file: string }[];
}

function readJson<T>(file: string): T | undefined {
  // A half-written score.json is reachable — an interrupted run can leave one.
  // Degrade to "no accuracy available" rather than killing the whole view.
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The two files the runner writes alongside the trace. `report.json` is how the
 * harness declared each task; `score.json` is what the restored suite says. The
 * gap between them is the interesting part, so both are read here.
 */
function outcomes(id: string): {
  score?: ScoreFile & { byName: Map<string, boolean> };
  groupOf: Map<string, string[]>;
  verdictOf: Map<string, string>;
} {
  const dir = runDir(id);
  const raw = readJson<ScoreFile>(join(dir, "score.json"));
  const report = readJson<{ tasks?: { id: string; tests?: string[]; status?: string }[] }>(
    join(dir, "report.json"),
  );
  const groupOf = new Map<string, string[]>();
  const verdictOf = new Map<string, string>();
  for (const t of report?.tasks ?? []) {
    groupOf.set(t.id, t.tests ?? []);
    verdictOf.set(t.id, t.status ?? "");
  }
  return {
    ...(raw ? { score: { ...raw, byName: new Map(raw.tests.map((t) => [t.name, t.ok])) } } : {}),
    groupOf,
    verdictOf,
  };
}

export function cmdShow(id: string, task?: string, full = false): void {
  const events = readTrace(id);
  const parents = parentMap(events);

  if (task) {
    const hit = events.filter((e) => (e.task ?? "").includes(task));
    if (hit.length === 0) {
      const names = [...new Set(events.map((e) => e.task).filter(Boolean))];
      console.log(`no task matching "${task}". Tasks in this run:\n`);
      for (const n of names) console.log(`  ${n}`);
      return;
    }
    for (const e of hit) for (const l of renderEvent(e, { parents, detail: full ? "full" : "task" })) console.log(l);
    return;
  }

  // Per-task rollup, then the run total. Start and end are kept apart: an
  // interrupted run never emits task_end, and collapsing them into one field
  // meant the task's START OFFSET was rendered as if it were a duration (a task
  // that began 2m05s in showed "02:05"). With no task_end we fall back to the
  // last event we saw for that task, which is a truthful lower bound.
  interface Row { task: string; calls: number; tools: number; in: number; out: number; startMs: number; lastMs: number; endMs?: number; end: string }
  const rows = new Map<string, Row>();
  let firstMs = 0;
  for (const e of events) {
    if (e.type === "task_start" && e.task) {
      rows.set(e.task, { task: e.task, calls: 0, tools: 0, in: 0, out: 0, startMs: e.ms, lastMs: e.ms, end: "" });
      firstMs = e.ms;
    }
    const r = e.task ? rows.get(e.task) : undefined;
    if (!r) continue;
    r.lastMs = Math.max(r.lastMs, e.ms);
    if (e.type === "model_call") { r.calls++; r.out += e.tokens_out ?? 0; r.in += e.tokens_in ?? 0; }
    if (e.type === "tool_call") r.tools++;
    if (e.type === "task_end") { r.end = e.summary ?? ""; r.endMs = e.ms; }
  }
  void firstMs;

  const duration = (r: Row): number => (r.endMs ?? r.lastMs) - r.startMs;

  // The trace says what the harness DID; only the score says whether it worked.
  // Both are optional — a run that was interrupted before scoring still renders,
  // it just cannot show accuracy.
  const { score, groupOf, verdictOf } = outcomes(id);
  const passing = (name: string): boolean | undefined => score?.byName.get(name);

  /** Of the tests this task was handed, how many are green now. */
  function fixed(task: string): { n: number; of: number } | undefined {
    const group = groupOf.get(task);
    if (!group || !score) return undefined;
    return { n: group.filter((t) => passing(t) === true).length, of: group.length };
  }

  /**
   * Tests in this task's file that are red now but were never in its group —
   * so they were green when the task started. The harness cannot see these:
   * `main.ts` scores a task against its own group only, which is why a task
   * that breaks a neighbour still reports "fixed".
   */
  function broke(task: string): number | undefined {
    const group = groupOf.get(task);
    if (!group || !score) return undefined;
    const file = task.split("/").pop();
    const mine = new Set(group);
    return score.tests.filter((t) => t.file === file && !t.ok && !mine.has(t.name)).length;
  }

  const W = Math.min(process.stdout.columns || 92, 96);
  const line = (ch: string): string => `  ${dim(ch.repeat(W - 4))}`;

  console.log("");
  console.log(line("\u2501"));
  console.log(`  ${bold(id)}`);
  console.log(line("\u2501"));
  console.log("");
  console.log(dim("   turns   tools       in     out    time   fixed  broke   claimed    test"));
  console.log("");

  for (const r of rows.values()) {
    const claimed = verdictOf.get(r.task) ?? "";
    const verdict = r.end.includes("all ")
      ? green("all green".padEnd(9))
      : claimed === "fixed"
        ? green("fixed".padEnd(9))
        : claimed === "test_is_wrong"
          ? cyan("test wrong".padEnd(9))
          : claimed === "gave_up"
            ? yellow("gave up".padEnd(9))
            : r.end
              ? yellow("partial".padEnd(9))
              : yellow("?".padEnd(9));

    const f = fixed(r.task);
    const b = broke(r.task);
    // A task that says "fixed" while it broke a neighbour is the one row a
    // reader must not skim past, so the count is coloured rather than dimmed.
    const acc = f ? (f.n === f.of ? green(`${f.n}/${f.of}`) : yellow(`${f.n}/${f.of}`)) : dim("\u2014");
    const reg = b === undefined ? dim("\u2014") : b > 0 ? yellow(String(b)) : dim("0");
    const pad = (s: string, w: number): string =>
      // eslint-disable-next-line no-control-regex
      " ".repeat(Math.max(0, w - s.replace(/\[[0-9;]*m/g, "").length)) + s;

    console.log(
      `  ${String(r.calls).padStart(6)}  ${String(r.tools).padStart(6)}  ` +
        `${String(r.in).padStart(7)}  ${String(r.out).padStart(6)}  ` +
        `${clock(duration(r)).padStart(6)}  ${pad(acc, 6)}  ${pad(reg, 5)}   ${verdict} ` +
        `${r.task.length > W - 66 ? `${r.task.slice(0, W - 67)}\u2026` : r.task}`,
    );
  }

  const end = events.find((e) => e.type === "run_end");
  const totalOut = events.reduce((n, e) => n + (e.tokens_out ?? 0), 0);
  const totalIn = events.reduce((n, e) => n + (e.tokens_in ?? 0), 0);
  console.log("");
  console.log(line("\u2500"));

  if (score) {
    // How many were red before the harness ran: every test it was handed. With
    // --n or --only that is the attempted subset, not the whole suite, so this
    // reports the delta the run is actually responsible for.
    const attempted = [...groupOf.values()].flat();
    const started = attempted.length;
    const nowGreen = attempted.filter((t) => score.byName.get(t) === true).length;
    const regressions = [...rows.keys()].reduce((n, t) => n + (broke(t) ?? 0), 0);
    const pct = score.testsTotal > 0 ? (score.testsPassing / score.testsTotal) * 100 : 0;

    console.log(
      `  ${bold(`${score.testsPassing}/${score.testsTotal}`)} green ${dim(`(${pct.toFixed(1)}%)`)}   ` +
        `${dim("fixed")} ${nowGreen}/${started}   ` +
        `${regressions > 0 ? yellow(`broke ${regressions}`) : dim("broke 0")}   ` +
        `${dim(score.hiddenApplied ? "visible + hidden" : "visible only")}`,
    );
  } else {
    console.log(`  ${dim("not scored yet \u2014 run")} jam score ${id}`);
  }
  console.log(
    `  ${rows.size} task(s)   ${dim("in")} ${totalIn.toLocaleString("en-US")}   ` +
      `${dim("out")} ${totalOut.toLocaleString("en-US")}   ${dim(end?.summary ?? "no run_end")}`,
  );
  console.log("");
  console.log(dim(`  jam show ${id} --task "<name>"     one task in full`));
  console.log("");

  if (full) for (const e of events) for (const l of renderEvent(e, { parents, detail: "full" })) console.log(l);
}

/**
 * Renders a trace as it is appended, until `until` resolves, then drains
 * whatever landed last. Used by both `jam watch` and `jam run --watch`.
 *
 * On Ctrl-C this DETACHES and returns `{ interrupted: true }`; it never exits
 * the process itself. `jam run -w` registers its own SIGINT handler first (it
 * stops the harness politely so the partial work still gets scored), and
 * listeners fire in registration order — a process.exit() here ran immediately
 * after that handler printed "Ctrl-C again to abandon", killing the run before
 * it could score and making that message a lie. The exit policy belongs to the
 * caller: cmdWatch still exits 130, cmdRun deliberately falls through to score.
 */
export async function tailTrace(file: string, until: Promise<unknown>): Promise<{ interrupted: boolean }> {
  const parents = new Map<string, string>();
  const status = new Status();
  let seen = 0;
  let done = false;
  let interrupted = false;
  let tokensIn = 0;
  let tokensOut = 0;
  let runMs = 0;
  status.set("starting", "", 0);
  void until.then(() => {
    done = true;
  });

  // Ctrl-C must not leave the shimmer line stranded on the terminal.
  const onInterrupt = (): void => {
    interrupted = true;
    status.stop();
    console.log("");
  };
  process.on("SIGINT", onInterrupt);

  // Count LINES already rendered, not bytes. A byte offset from statSync used
  // as a string index desyncs the moment a multi-byte character (any "§" in a
  // test name) goes past, and every later line silently fails to parse.
  let lastEventAt = Date.now();
  let runEnded = false;
  const drain = (): void => {
    if (!existsSync(file)) return;
    const lines = readFileSync(file, "utf8").split("\n");
    const complete = lines.length - 1; // the last element is a partial line
    if (complete <= seen) return;

    status.clear();
    for (let i = seen; i < complete; i++) {
      const e = parse(lines[i] ?? "");
      if (!e) continue;
      if (e.agent && e.parent) parents.set(e.agent, e.parent);
      tokensIn += e.tokens_in ?? 0;
      tokensOut += e.tokens_out ?? 0;
      runMs = Math.max(runMs, e.ms ?? 0);
      for (const l of renderEvent(e, { parents })) console.log(l);

      // What we are waiting for next, so the spinner says something true.
      if (e.type === "model_call") {
        status.set((e.calls ?? []).length > 0 ? "running tools" : "finishing up", "", runMs);
      } else if (e.type === "tool_call") status.set("thinking", "", runMs);
      else if (e.type === "task_start") status.set("thinking", "", runMs);
      else if (e.type === "run_end") { status.stop(); runEnded = true; }
    }
    seen = complete;
    // Once run_end has gone by, leave the status line dead. Status.set() re-arms
    // the interval whenever one isn't running, so this trailing call used to
    // resurrect the shimmer underneath the "done" banner until the outer loop
    // noticed `done`.
    if (runEnded) return;
    // The clock advances with the trace, so it keeps counting from where the
    // run actually is rather than restarting when you attach.
    const drift = Date.now() - lastEventAt;
    status.set(
      status.label || "thinking",
      `${(tokensIn + tokensOut).toLocaleString("en-US")} tokens`,
      runMs + (Number.isFinite(drift) ? drift : 0),
    );
    lastEventAt = Date.now();
  };

  while (!done && !interrupted) {
    drain();
    await new Promise((r) => setTimeout(r, 200));
  }
  // After Ctrl-C the trace is still being written by a harness that is shutting
  // down; a final drain would print under the blank line we just left.
  if (!interrupted) drain();
  status.stop();
  process.off("SIGINT", onInterrupt);
  return { interrupted };
}

/**
 * A run still in flight: no score.json yet (the runner writes that last), its
 * trace has no run_end (the harness itself isn't done, even if it never gets
 * scored — e.g. a second Ctrl-C abandons scoring but the harness still closes
 * its trace), and the trace touched recently.
 */
export function activeRun(): string | undefined {
  const now = Date.now();
  for (const id of listRuns()) {
    const dir = runDir(id);
    if (existsSync(join(dir, "score.json"))) continue;
    const trace = join(dir, "trace.jsonl");
    if (!existsSync(trace)) continue;
    if (readFileSync(trace, "utf8").includes('"run_end"')) continue;
    if (now - statSync(trace).mtimeMs < 60_000) return id;
  }
  return undefined;
}

/** Follows a trace as it is written. Polls, which is reliable everywhere. */
export async function cmdWatch(id?: string): Promise<void> {
  const run = id ?? activeRun();
  if (!run) {
    console.log(
      `\n  nothing is running.\n\n` +
        `  ${dim("jam run --n 1 -w")}     start one and watch it here\n` +
        `  ${dim("jam show")}             read the last run instead\n`,
    );
    return;
  }
  // An explicit id that does not exist would otherwise wait forever: the
  // stall check only fires once a trace file exists.
  if (!existsSync(runDir(run))) throw new Error(`no run "${run}"`);
  const file = join(runDir(run), "trace.jsonl");
  const scoreFile = join(runDir(run), "score.json");
  if (!existsSync(file)) throw new Error(`run "${run}" has no trace`);
  console.log(`\n  ${dim("watching")}  ${bold(run)}\n`);

  // Done when the runner writes the score, or the harness says so, or the
  // trace simply stops changing — a hard-killed run leaves neither marker.
  const IDLE_MS = 90_000;
  const ended = new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      const finished =
        existsSync(scoreFile) ||
        (existsSync(file) && readFileSync(file, "utf8").includes('"run_end"'));
      const stalled = existsSync(file) && Date.now() - statSync(file).mtimeMs > IDLE_MS;
      if (finished || stalled) {
        clearInterval(poll);
        if (stalled && !finished) {
          console.log(dim(`\n  no events for ${IDLE_MS / 1000}s — the run looks dead`));
        }
        resolve();
      }
    }, 250);
  });
  const { interrupted } = await tailTrace(file, ended);
  // Standalone `jam watch` owns nothing but the view, so Ctrl-C just leaves —
  // there is no scoring step here worth falling through to.
  if (interrupted) process.exit(130);
}

export function cmdLs(): void {
  const runs = listRuns();
  if (runs.length === 0) {
    console.log("\n  no runs yet\n");
    return;
  }
  console.log("");
  console.log(dim("    green      out     time   outcome       run"));
  console.log("");
  for (const id of runs.slice(0, 20)) {
    const f = join(runDir(id), "score.json");
    if (!existsSync(f)) {
      console.log(`  ${"-".padStart(9)}  ${"-".padStart(7)}  ${"-".padStart(7)}   ${dim("no score".padEnd(12))}  ${id}`);
      continue;
    }
    // A truncated score.json is reachable in practice (an interrupted run can
    // leave one half-written), and one bad file used to throw out of the whole
    // listing. Degrade the single row instead and keep going.
    let sc: {
      testsPassing: number; testsTotal: number; wallSeconds: number; outcome: string;
      hiddenApplied: boolean;
    };
    try {
      sc = JSON.parse(readFileSync(f, "utf8")) as typeof sc;
    } catch {
      console.log(`  ${"-".padStart(9)}  ${"-".padStart(7)}  ${"-".padStart(7)}   ${yellow("bad score".padEnd(12))}  ${id}`);
      continue;
    }
    const events = existsSync(join(runDir(id), "trace.jsonl")) ? readTrace(id) : [];
    const out = events.reduce((n, e) => n + (e.tokens_out ?? 0), 0);
    const ratio = `${sc.testsPassing}/${sc.testsTotal}`;
    const bad = sc.outcome !== "completed";
    console.log(
      `  ${ratio.padStart(9)}  ${String(out).padStart(7)}  ${`${sc.wallSeconds}s`.padStart(7)}   ` +
        `${bad ? yellow(sc.outcome.padEnd(12)) : dim(sc.outcome.padEnd(12))}  ${id}` +
        (sc.hiddenApplied ? cyan("  +hidden") : ""),
    );
  }
  console.log("");
}

export function cmdDiff(id: string): void {
  const f = join(runDir(id), "workspace.diff");
  if (!existsSync(f)) throw new Error(`no workspace.diff for run "${id}"`);
  const d = readFileSync(f, "utf8");
  console.log(d.trim() === "" ? "the harness changed nothing" : d);
}
