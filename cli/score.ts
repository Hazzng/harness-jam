import { existsSync, readFileSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface TestRow {
  name: string;
  ok: boolean;
  /** Which file it came from — how hidden siblings are attributed to a bug. */
  file: string;
}

/**
 * `out` lives outside the workspace on purpose: a report written into the
 * workspace survives into the next scoring pass, where `git add -A` sweeps it
 * into workspace.diff — leaking the hidden tests' names along with it.
 */
export async function vitestJson(workspace: string, out: string): Promise<string> {
  if (existsSync(out)) rmSync(out);
  try {
    await run("npx", ["vitest", "run", "--reporter=json", `--outputFile=${out}`], {
      cwd: workspace,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 300_000,
    });
  } catch {
    // Failing tests exit non-zero; the report is still written.
  }
  return out;
}

export function readTests(reportFile: string): TestRow[] {
  if (!existsSync(reportFile)) return [];
  const report = JSON.parse(readFileSync(reportFile, "utf8")) as {
    testResults: { name?: string; assertionResults: { fullName: string; status: string }[] }[];
  };
  return report.testResults.flatMap((f) =>
    f.assertionResults.map((a) => ({
      name: a.fullName,
      ok: a.status === "passed",
      file: (f.name ?? "").split("/").slice(-1)[0] ?? "",
    })),
  );
}
