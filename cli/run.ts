import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HIDDEN_TESTS, PRISTINE_TESTS, PROBLEM, ROOT, runDir } from "./paths.js";
import { bold, dim } from "./render.js";
import { treeHash } from "./integrity.js";
import { readTests, vitestJson } from "./score.js";
import { tailTrace } from "./show.js";

import { transportEnv } from "../base/config.js";

/**
 * A fresh copy of the problem tree, OUTSIDE this repository.
 *
 * Nesting it under runs/ put the agent's shell inside our own git tree: a
 * `git status` from the workspace listed base/, cli/ and .env, and nothing
 * stopped it walking up and editing the meter. It lives in a temp directory
 * now, with its own git repo so the agent can diff its own work and see
 * nothing else.
 */
function materialise(dir: string): string {
  const ws = join(mkdtempSync(join(tmpdir(), "jam-")), "minicalc");
  cpSync(PROBLEM, ws, { recursive: true, filter: (s) => !s.includes("node_modules") });
  const mods = join(PROBLEM, "node_modules");
  if (existsSync(mods)) symlinkSync(mods, join(ws, "node_modules"), "dir");

  const git = (...a: string[]) => execFileSync("git", a, { cwd: ws, stdio: "pipe" });
  git("init", "-q");
  git("add", "-A");
  git(
    "-c", "user.email=jam@local",
    "-c", "user.name=jam",
    "-c", "commit.gpgsign=false",
    "commit", "-qm", "problem",
  );

  writeFileSync(join(dir, "workspace.path"), ws + "\n");
  return ws;
}

/**
 * Runs the harness to completion, or until you interrupt it. There is no time
 * limit: a run takes as long as it takes, and Ctrl-C stops it politely so that
 * whatever it managed still gets scored.
 */
function spawnHarness(ws: string, id: string, dir: string, opts: RunOpts): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      [
        "tsx",
        join(ROOT, "harness", "main.ts"),
        "--workspace", ws,
        "--run", id,
        "--trace", join(dir, "trace.jsonl"),
        "--report", join(dir, "report.json"),
        ...(opts.only ? ["--only", opts.only] : []),
        ...(opts.n ? ["--n", String(opts.n)] : []),
      ],
      {
        cwd: ROOT,
        stdio: opts.verbose ? "inherit" : "ignore",
        env: { ...process.env, ...transportEnv() },
      },
    );

    let outcome = "completed";
    const onInterrupt = (): void => {
      if (outcome === "cancelled") {
        process.exit(130); // a second Ctrl-C means now
      }
      outcome = "cancelled";
      console.log(dim("\n  stopping — scoring what it managed. Ctrl-C again to abandon."));
      child.kill("SIGTERM");
    };
    process.on("SIGINT", onInterrupt);

    // "error" and "exit" are alternatives, not a sequence — but a process that
    // starts and then fails to be killed emits both, so settle only once.
    let settled = false;
    const finish = (result: string): void => {
      if (settled) return;
      settled = true;
      process.off("SIGINT", onInterrupt);
      resolve(result);
    };

    child.on("exit", (code) => {
      finish(outcome === "cancelled" ? "cancelled" : code === 0 ? "completed" : `exit ${code}`);
    });

    // If npx cannot be spawned at all there is no "exit" to wait for, and an
    // unhandled "error" event throws. Turn it into an outcome like any other.
    child.on("error", (err) => {
      finish(`failed to start: ${err.message}`);
    });
  });
}

/**
 * Per-bug scoring needs the test-to-bug mapping, which stays in the private
 * forge repo — knowing which tests belong to one bug is itself a hint. Locally
 * you get tests-green; the bug-level score is computed on the day.
 */
export interface Score {
  run: string;
  outcome: string;
  testsPassing: number;
  testsTotal: number;
  hiddenApplied: boolean;
  /** Fingerprint of the bug set this tree was built from. */
  setId: string;
  /** True if problems/minicalc no longer matches what was shipped. */
  treeModified: boolean;
  flagged: { test: string; reason: string }[];
  wallSeconds: number;
  /** Every test with its outcome. The forge maps these back to bugs. */
  tests: { name: string; ok: boolean; file: string }[];
}

export interface RunOpts {
  /** Stream the harness's own stdout. For debugging the harness itself. */
  verbose: boolean;
  /** Stream the rendered trace as it is written. */
  watch?: boolean;
  only?: string;
  n?: number;
}

export async function cmdRun(id: string, opts: RunOpts): Promise<Score> {
  const dir = runDir(id);
  mkdirSync(dir, { recursive: true });
  const ws = materialise(dir);

  // Was the problem tree edited by hand since it was built?
  const expectedHash = existsSync(join(PROBLEM, ".jam-treehash"))
    ? readFileSync(join(PROBLEM, ".jam-treehash"), "utf8").trim()
    : "";
  const actualHash = treeHash(PROBLEM);
  const treeModified = expectedHash !== "" && expectedHash !== actualHash;

  const started = Date.now();
  console.log(`  ${dim("runid".padEnd(10))}${bold(id)}`);
  console.log(`  ${dim("workspace".padEnd(10))}${dim(ws)}`);
  if (!opts.watch && !opts.verbose) console.log(`  ${dim("watch".padEnd(10))}${dim(`jam watch ${id}`)}`);
  if (treeModified) {
    console.log(
      `  ${dim("WARNING".padEnd(10))}problems/minicalc has been edited by hand. ` +
        `Every run starts from it, so this run is not comparable.`,
    );
  }

  const running = spawnHarness(ws, id, dir, opts);
  if (opts.watch) await tailTrace(join(dir, "trace.jsonl"), running);
  const outcome = await running;
  const wallSeconds = Math.round((Date.now() - started) / 1000);

  return scoreWorkspace(id, ws, dir, outcome, wallSeconds, opts, treeModified);
}

/**
 * Restores the tests, overlays the hidden siblings if present, runs the suite
 * and writes score.json. Split out so an interrupted run can be scored later
 * with `jam score`.
 */
export async function scoreWorkspace(
  id: string,
  ws: string,
  dir: string,
  outcome: string,
  wallSeconds: number,
  opts: Pick<RunOpts, "only" | "n"> = {},
  treeModified = false,
): Promise<Score> {
  // Only for workspaces made before the vitest report moved out of the
  // workspace: those still hold a .jam-score.json, which .gitignore does not
  // cover, and the staging below would sweep it into the diff. The fixed code
  // never writes one, so this is a no-op now and safe to delete once no
  // pre-fix workspace survives.
  rmSync(join(ws, ".jam-score.json"), { force: true });

  // The diff has to be taken before anything below touches the tests. Restoring
  // them first would erase the evidence that the harness edited or deleted a
  // test — the tampering a reviewer most wants to see — and overlaying the
  // hidden siblings would stage their assertions into workspace.diff verbatim.
  // Nothing later in this function reads the git index, so first is safe.
  try {
    // Stage first: a plain `git diff` omits files the harness created, and a
    // new source file is exactly the sort of thing a fix might add.
    execFileSync("git", ["add", "-A"], { cwd: ws, stdio: "pipe" });
    writeFileSync(
      join(dir, "workspace.diff"),
      execFileSync("git", ["diff", "--cached"], {
        cwd: ws,
        maxBuffer: 64 * 1024 * 1024,
      }).toString(),
    );
  } catch {
    // A harness that wrecked the workspace's git dir still gets scored.
  }

  // Restore the tests. Anything the harness did to them evaporates here, which
  // is why deleting a failing test earns nothing.
  rmSync(join(ws, "tests"), { recursive: true, force: true });
  cpSync(PRISTINE_TESTS, join(ws, "tests"), { recursive: true });

  const hiddenApplied = existsSync(HIDDEN_TESTS);
  if (hiddenApplied) {
    cpSync(HIDDEN_TESTS, join(ws, "tests"), { recursive: true });
  } else {
    console.log("note: no problems/.hidden — scoring against visible tests only");
  }

  // The report goes in the run directory, not the workspace: vitest takes an
  // absolute --outputFile, and a report left in the workspace would be staged
  // into the next re-score's diff.
  const results = readTests(await vitestJson(ws, join(dir, "vitest.json")));
  const passing = results.filter((r) => r.ok).length;

  const reportPath = join(dir, "report.json");
  const report = existsSync(reportPath)
    ? (JSON.parse(readFileSync(reportPath, "utf8")) as {
        tasks?: { tests?: string[]; status?: string; reason?: string }[];
      })
    : { tasks: [] };
  const flagged = (report.tasks ?? [])
    .filter((t) => t.status === "test_is_wrong" && (t.reason ?? "").trim().length > 0)
    .flatMap((t) => (t.tests ?? []).map((test) => ({ test, reason: t.reason! })));

  const score: Score = {
    run: id,
    outcome,
    setId: existsSync(join(ws, ".jam-setid"))
      ? readFileSync(join(ws, ".jam-setid"), "utf8").trim()
      : "",
    treeModified,
    testsPassing: passing,
    testsTotal: results.length,
    hiddenApplied,
    flagged,
    wallSeconds,
    tests: results,
  };
  writeFileSync(join(dir, "score.json"), JSON.stringify(score, null, 2) + "\n");

  const failing = results.length - passing;
  console.log("");
  console.log(`  ${dim("─".repeat(88))}`);
  // No results at all is not a score of zero — vitest wrote no report, so
  // printing "0/0 green" would read as a clean run. Say what actually happened.
  if (results.length === 0) {
    console.log(`  ${dim("suite".padEnd(10))}no results — vitest wrote no report`);
    console.log(
      `  ${dim("".padEnd(10))}${dim(
        "most likely the sources fail to compile. Run npx vitest run by hand in the workspace " +
          `(path in runs/${id}/workspace.path, printed above) to see the error.`,
      )}`,
    );
  } else {
    console.log(
      `  ${dim("suite".padEnd(10))}${passing}/${results.length} green` +
        (failing > 0 ? dim(`   ${failing} still failing`) : ""),
    );
  }
  console.log(
    `  ${dim("scored".padEnd(10))}${dim(
      hiddenApplied ? "visible + hidden tests" : "visible tests only (no problems/.hidden)",
    )}`,
  );
  if (flagged.length > 0) {
    console.log(`  ${dim("flagged".padEnd(10))}${flagged.length} test(s) reported as wrong`);
  }
  // The commonest confusion: one task went green, the suite did not, because
  // the other failures were never handed to the harness at all.
  if ((opts.n || opts.only) && failing > 0) {
    const why = opts.only ? `--only "${opts.only}"` : `--n ${opts.n}`;
    console.log(
      `  ${dim("note".padEnd(10))}${dim(
        `${why} limited this run — the remaining failures were never attempted`,
      )}`,
    );
  }
  console.log("");
  return score;
}


/** Re-score a finished or interrupted run, without running the harness again. */
export async function cmdScore(id: string): Promise<Score> {
  const dir = runDir(id);
  const pathFile = join(dir, "workspace.path");
  if (!existsSync(pathFile)) {
    throw new Error(`run "${id}" has no recorded workspace — nothing to score`);
  }
  const ws = readFileSync(pathFile, "utf8").trim();
  if (!existsSync(ws)) {
    throw new Error(`the workspace for "${id}" is gone: ${ws}`);
  }
  const prior = existsSync(join(dir, "score.json"))
    ? (JSON.parse(readFileSync(join(dir, "score.json"), "utf8")) as Score)
    : undefined;
  console.log("");
  console.log(`  ${dim("runid".padEnd(10))}${bold(id)}`);
  console.log(`  ${dim("workspace".padEnd(10))}${dim(ws)}`);
  return scoreWorkspace(id, ws, dir, prior?.outcome ?? "rescored", prior?.wallSeconds ?? 0);
}
