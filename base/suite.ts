import { join } from "node:path";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { sh } from "./exec.js";

let seq = 0;

export interface TestOutcome {
  name: string;
  ok: boolean;
  message: string;
  /** The file it lives in, e.g. "agg.test.ts". */
  file: string;
}

/**
 * Runs the workspace's test suite and returns every test with its outcome.
 * Pass file paths to narrow it — running one file is a great deal faster than
 * running all of them, and you will be doing this a lot.
 */
export async function runSuite(
  workspace: string,
  files: string[] = [],
): Promise<TestOutcome[]> {
  // Unique per call: two suite runs at once in the same tree would otherwise
  // clobber each other's report, and fanning out is a thing you might do.
  const out = join(workspace, `.jam-report-${process.pid}-${seq++}.json`);
  if (existsSync(out)) rmSync(out);
  const r = await sh(
    workspace,
    `npx vitest run --reporter=json --outputFile=${JSON.stringify(out)} ${files.join(" ")}`,
    180_000,
  );
  if (!existsSync(out)) {
    // Returning [] here would look exactly like "no failing tests" and the
    // run would finish in a second having done nothing. Fail loudly instead.
    throw new Error(
      `vitest produced no report in ${workspace} (exit ${r.code}).\n` +
        `${r.stderr || r.stdout || "no output"}`,
    );
  }
  const report = JSON.parse(readFileSync(out, "utf8")) as {
    testResults: {
      name?: string;
      assertionResults: { fullName: string; status: string; failureMessages?: string[] }[];
    }[];
  };
  const results: TestOutcome[] = [];
  for (const file of report.testResults) {
    const base = (file.name ?? "").split("/").slice(-1)[0] ?? "";
    for (const a of file.assertionResults) {
      results.push({
        name: a.fullName,
        ok: a.status === "passed",
        message: (a.failureMessages ?? []).join("\n").slice(0, 2000),
        file: base,
      });
    }
  }
  rmSync(out, { force: true });
  return results;
}
